import { Outlet } from 'react-router-dom';

function LandingLayout() {
  return (
    <main className="min-h-screen">
      <Outlet />
    </main>
  );
}

export default LandingLayout;