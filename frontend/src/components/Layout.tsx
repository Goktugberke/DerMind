import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';

const Layout = () => {
  return (
    <div className="app-layout">
      <Navbar />
      <main className="main-content">
        <Outlet />
      </main>
      <footer className="footer">
        <div className="container">
          <p>&copy; 2024 DerMind. Tüm hakları saklıdır.</p>
        </div>
      </footer>
    </div>
  );
};

export default Layout;

