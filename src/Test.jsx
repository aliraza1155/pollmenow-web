import { useLocation } from 'react-router-dom';

export default function Test() {
  const location = useLocation();
  return <div>Current path: {location.pathname}</div>;
}