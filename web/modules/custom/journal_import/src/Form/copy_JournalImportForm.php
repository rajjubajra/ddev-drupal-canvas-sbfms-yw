<?php

namespace Drupal\journal_import\Form;

use Drupal\Core\Form\FormBase;
use Drupal\Core\Form\FormStateInterface;
use Drupal\node\Entity\Node;
use Symfony\Component\HttpFoundation\RedirectResponse;



class JournalImportForm extends FormBase {

  public function getFormId() {
    return 'journal_import_form';
  }


  public function buildForm(array $form, FormStateInterface $form_state) {

    $rows = $form_state->get('preview_rows');

    // Get file from tempstore
    $fid = \Drupal::service('tempstore.private')
      ->get('journal_import')
      ->get('csv_fid');

    if (!$fid) {
      $form['message'] = [
        '#markup' => '<p>No file found. Please upload from Journal Import content.</p>',
      ];
      return $form;
    }

    $file = \Drupal\file\Entity\File::load($fid);

    if (!$file) {
      $form['message'] = ['#markup' => '<p>Invalid file.</p>'];
      return $form;
    }

    // ✅ Only allow CSV
    $extension = strtolower(pathinfo($file->getFilename(), PATHINFO_EXTENSION));
    if ($extension !== 'csv') {
      $form['message'] = ['#markup' => '<p>Only CSV files are allowed.</p>'];
      return $form;
    }

    $filepath = \Drupal::service('file_system')->realpath($file->getFileUri());

    // Process CSV only once
    if (!$rows) {
      $rows = $this->processCsv($filepath);
      $form_state->set('preview_rows', $rows);
    }

    // Preview
    if (!empty($rows)) {

      $header = array_keys($rows[0]);

      $form['preview'] = [
        '#type' => 'table',
        '#header' => $header,
      ];

      foreach (array_slice($rows, 0, 20) as $i => $row) {
        foreach ($row as $key => $value) {
          $form['preview'][$i][$key] = [
            '#markup' => (!empty($value) && is_scalar($value)) ? $value : '-',
          ];
        }
      }

      $form['confirm'] = [
        '#type' => 'submit',
        '#value' => $this->t('Confirm Import'),
        '#submit' => ['::confirmImport'],
      ];
    }

    return $form;
  }

  /**
   * Process CSV safely
   */
  private function processCsv($filepath) {

    $rows = [];
    $errors = [];
    $row_number = 1;

    if (($handle = fopen($filepath, 'r')) !== FALSE) {

      $header = fgetcsv($handle);

      if (empty($header)) {
        \Drupal::messenger()->addError('CSV header is missing.');
        return [];
      }

      // Clean header (remove BOM)
      $header[0] = preg_replace('/^\xEF\xBB\xBF/', '', $header[0]);
      $header = array_map('trim', $header);

      $required = [
        'title',
        'amount',
        'date',
        'debit_account',
        'credit_account',
      ];

      foreach ($required as $col) {
        if (!in_array($col, $header)) {
          \Drupal::messenger()->addError("Missing column: $col");
          return [];
        }
      }

      while (($row = fgetcsv($handle)) !== FALSE) {
        $row_number++;

        if (empty(array_filter($row))) {
          continue;
        }

        if (count($header) !== count($row)) {
          $errors[] = "Row $row_number skipped: column mismatch";
          continue;
        }

        $data = array_combine($header, $row);

        if (!is_numeric($data['amount'])) {
          $errors[] = "Row $row_number skipped: amount must be numeric";
          continue;
        }

        if (empty($data['title'])) {
          $errors[] = "Row $row_number skipped: title required";
          continue;
        }

        $rows[] = $data;
      }

      fclose($handle);
    }

    foreach (array_slice($errors, 0, 20) as $error) {
      \Drupal::messenger()->addWarning($error);
    }

    return $rows;
  }

  /**
   * Confirm import using Batch API
   */
  public function confirmImport(array &$form, FormStateInterface $form_state) {

    $rows = $form_state->get('preview_rows');

    if (empty($rows)) {
      \Drupal::messenger()->addError('Nothing to import.');
      return;
    }

    // ✅ Clear preview BEFORE batch starts
    $form_state->set('preview_rows', NULL);

    // 🔥 Preload existing titles (FAST duplicate detection)
    $titles = array_column($rows, 'title');

    $existing = \Drupal::entityQuery('node')
      ->condition('type', 'acc_journal_entry')
      ->condition('title', $titles, 'IN')
      ->accessCheck(FALSE)
      ->execute();

    $existing_titles = [];

    if (!empty($existing)) {
      $nodes = Node::loadMultiple($existing);
      foreach ($nodes as $node) {
        $existing_titles[] = $node->getTitle();
      }
    }

    // Batch setup
    $batch = [
      'title' => 'Importing CSV...',
      'operations' => [],
      'finished' => [self::class, 'batchFinished'],
    ];

    foreach ($rows as $row) {
      $batch['operations'][] = [
        [self::class, 'processRow'],
        [$row, $existing_titles],
      ];
    }

    batch_set($batch);
  }

  /**
   * Process each row (Batch)
   */
  public static function processRow($row, $existing_titles, &$context) {

    $title = $row['title'];

    // 🚫 Skip duplicate
    if (in_array($title, $existing_titles)) {
      $context['results']['skipped'][] = $title;
      return;
    }

    try {

      $debit_id = self::getOrCreateLedgerStatic($row['debit_account']);
      $credit_id = self::getOrCreateLedgerStatic($row['credit_account']);

      $node = Node::create([
        'type'  => 'acc_journal_entry',
        'title' => $title,
        'field_amount' => $row['amount'],
        'field_date'   => $row['date'],
        'field_debit_account'  => $debit_id,
        'field_credit_account' => $credit_id,
        'field_description' => $row['description'] ?? '',
        'field_comment' => $row['comment'] ?? '',
        'status' => 1,
      ]);

      $node->save();

      $context['results']['imported'][] = $title;

    } catch (\Exception $e) {
      $context['results']['errors'][] = $title;
    }
  }

  /**
   * Batch finished callback
   */
  public static function batchFinished($success, $results, $operations) {

    if ($success) {
      $count = count($results['imported'] ?? []);
      $skipped = count($results['skipped'] ?? []);

      \Drupal::messenger()->addStatus("Imported: $count");
      \Drupal::messenger()->addWarning("Skipped duplicates: $skipped");
    }
    else {
      \Drupal::messenger()->addError('Import failed.');
    }


    if ($success) {
        \Drupal::messenger()->addStatus('Import completed.');
      }

      // Clear tempstore
      \Drupal::service('tempstore.private')
        ->get('journal_import')
        ->delete('csv_fid');

    // ✅ Redirect to clean page
      $url = \Drupal\Core\Url::fromRoute('journal_import.form');
      $response = new RedirectResponse($url->toString());
      $response->send();


  }

  /**
   * Static ledger creation
   */
  private static function getOrCreateLedgerStatic($title) {

    if (empty($title)) {
      return NULL;
    }

    $storage = \Drupal::entityTypeManager()->getStorage('node');

    $existing = $storage->loadByProperties([
      'type' => 'accounting_ledger',
      'title' => $title,
    ]);

    if ($ledger = reset($existing)) {
      return $ledger->id();
    }

    $ledger = $storage->create([
      'type' => 'accounting_ledger',
      'title' => $title,
      'status' => 1,
    ]);

    $ledger->save();

    return $ledger->id();
  }

  public function submitForm(array &$form, FormStateInterface $form_state) {
    // Not used
  }

}