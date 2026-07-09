import { JsonApiClient, sortMenu } from 'drupal-canvas';
import useSWR from 'swr';

const client = new JsonApiClient();

const Navigation = () => {
  const { data, isLoading, error } = useSWR(
    ['menu_items', 'main'],
    ([type, resourceId]) => client.getResource(type, resourceId),
  );
  if (error) return 'An error has occurred.';
  if (isLoading) return 'Loading...';

  const menu = sortMenu(data);

  return (
    <ul>
      {menu.map((item) => (
        <li key={item.id}>
          <a href={item.url}>{item.title}</a>
        </li>
      ))}
    </ul>
  );
};

export default Navigation;