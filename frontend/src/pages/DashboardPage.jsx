import { useAuth } from '../context/AuthContext.jsx';

export default function DashboardPage() {
  const { user } = useAuth();
  return (
    <div className="page">
      <header className="page-header">
        <div>
          <h1>Welcome, {user?.name?.split(' ')[0]}</h1>
          <p>Your spending overview will appear here.</p>
        </div>
      </header>
    </div>
  );
}
