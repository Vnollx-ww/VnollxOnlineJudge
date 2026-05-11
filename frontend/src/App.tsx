import { BrowserRouter as Router } from "react-router-dom";
import { Toaster } from 'react-hot-toast';
import { PermissionProvider } from "./contexts/PermissionContext";
import { MessageWebSocketProvider } from "./contexts/MessageWebSocketContext";
import AppRoutes from "./app/routes";

function App() {
  return (
    <PermissionProvider>
      <MessageWebSocketProvider>
        <Toaster
          position="top-center"
          reverseOrder={false}
          toastOptions={{
            duration: 3000,
            style: {
              background: '#fff',
              color: '#1f1f1f',
              padding: '16px 24px',
              borderRadius: '16px',
              fontSize: '14px',
              fontWeight: '500',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15), 0 0 0 1px rgba(0, 0, 0, 0.05)',
              maxWidth: '500px',
            },
            success: {
              duration: 2000,
              iconTheme: { primary: '#34a853', secondary: '#fff' },
              style: { background: '#fff', color: '#1f1f1f' },
            },
            error: {
              duration: 3000,
              iconTheme: { primary: '#d93025', secondary: '#fff' },
              style: { background: '#fff', color: '#1f1f1f' },
            },
            loading: {
              iconTheme: { primary: '#1a73e8', secondary: '#fff' },
            },
          }}
        />
        <Router>
          <AppRoutes />
        </Router>
      </MessageWebSocketProvider>
    </PermissionProvider>
  );
}

export default App;
