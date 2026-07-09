# Drupal Configuration Import Guide (Content Types & Fields)

This project stores all Drupal configuration (content types, fields, displays, etc.) in:

```
/config/sync
```

Follow the steps below to recreate the full site structure (e.g. Invoice, Journal Entry, Ledger) on a new Drupal installation.

---

## 📦 Prerequisites

* Drupal installed
* Drush installed
* Database configured and working
* Same/conpatible Drupal core & modules enabled

---

## ⚙️ Step 1 — Clone the Repository

```
git clone <your-repo-url>
cd <project-folder>
```

---

## ⚙️ Step 2 — Configure settings.php

Open:

```
web/sites/default/settings.php
```

Add or update:

```php
$settings['config_sync_directory'] = '../config/sync';
```

---

## ⚙️ Step 3 — Install Required Modules

Make sure all required modules are enabled before importing config:

```
drush en node field text user system -y
```

Also enable any custom/contrib modules used in this project.

---

## ⚙️ Step 4 — Import Configuration

Run:

```
drush cim -y
```

This will create:

* Content types (e.g. Invoice, Journal Entry)
* Fields
* Taxonomies
* Form displays
* View displays

---

## ⚙️ Step 5 — Run Database Updates

```
drush updb -y
```

---

## ⚙️ Step 6 — Clear Cache

```
drush cr
```

---

## ✅ Done

Your content structure is now ready.

---

## ⚠️ Important Notes

### 1. Do NOT modify config directly in production

Always:

* Change locally
* Export with `drush cex`
* Commit to Git
* Deploy

---

### 2. Config will overwrite structure

Running:

```
drush cim
```

will:

* overwrite existing config
* remove config not present in `/config/sync`

---

### 3. Never delete fields with existing data

If a field is removed from config:

* Drupal may delete it
* Existing data can be lost

Instead:

* hide fields from display
* keep them in config if data exists

---

### 4. Safe workflow

1. Develop locally (DDEV)
2. Export config:

   ```
   ddev drush cex
   ```
3. Commit:

   ```
   git add config/sync
   git commit -m "Update config"
   ```
4. Deploy and import:

   ```
   drush cim -y
   ```

---

## 🧠 Concept

* Config = Structure (content types, fields)
* Content = Data (nodes, invoices, journal entries)

This repo only manages structure.

---

## 🧯 Troubleshooting

### Config import fails

Run:

```
drush config:status
```

Check missing modules or dependencies.

---

### Site breaks after import

Restore database backup and re-check config differences before importing again.

---

## 📌 Notes for SBFMS Project

This system relies heavily on:

* Journal Entries
* Ledger Accounts
* Invoices
* Financial Year

All structure is controlled via configuration.
Always test config changes with real data before deploying.

---





 It provides clear, step‑by‑step instructions for installing DDEV on Windows and running your Drupal project locally with the provided `db.sql` file.

```markdown
# Drupal Project – Local Setup with DDEV (Windows)

Follow these steps to install DDEV on Windows and run this project locally.

---

## 1. Install Prerequisites

Before installing DDEV, make sure you have the following installed:

- **Windows 10/11 Pro or Enterprise** (required for Docker Desktop)
- **Docker Desktop for Windows**  
  Download and install from: https://www.docker.com/products/docker-desktop  
  > ⚠️ Ensure that **WSL2** and **Linux containers** are enabled during installation.
- **Git for Windows**  
  Download from: https://git-scm.com/download/win
- **DDEV**  
  Download the latest Windows installer from: https://ddev.readthedocs.io/en/stable/users/install/ddev-installation/

After installation, verify DDEV is working by running:

```powershell
ddev version
```

---

## 2. Clone the Repository

Open **PowerShell** or **Git Bash** and clone your project:

```powershell
git clone https://github.com/<your-username>/<your-repo>.git
cd <your-repo>
```

---

## 3. Configure DDEV for Drupal

Inside the project folder, run:

```powershell
ddev config --project-type=drupal --docroot=web --create-docroot
```

- Replace `web` with your Drupal docroot folder if different (e.g., `htdocs` or `drupal`).
- This creates a `.ddev` folder with configuration files.

---

## 4. Start the DDEV Environment

```powershell
ddev start
```

This will spin up the containers (web, db, etc.).

---

## 5. Import the Database

Assuming you have a `db.sql` file in the repository root:

```powershell
ddev import-db --src=db.sql
```


#This works regardless of filename:

```powershell
gzip -dc db.sql | ddev import-db
```


---

## 6. Install Project Dependencies

If your project uses **Composer**:

```powershell
ddev composer install
```

---

## 7. Access the Site

Once everything is running:

- Website: http://<projectname>.ddev.site  
- phpMyAdmin: http://<projectname>.ddev.site:8036  
- Mailhog (email testing): http://<projectname>.ddev.site:8025  

---

## 8. Common Commands

- Stop containers:  
  ```powershell
  ddev stop
  ```

- Restart containers:  
  ```powershell
  ddev restart
  ```

- SSH into web container:  
  ```powershell
  ddev ssh
  ```

---

## ✅ You’re Ready!

Your Drupal project should now be running locally with DDEV on Windows.
```

---