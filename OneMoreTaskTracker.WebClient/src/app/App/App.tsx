import {BrowserRouter, Route, Routes} from 'react-router-dom';
import {AuthProvider} from '../../common/auth/AuthContext';
import {LoginPage} from '../../pages/Login';
import {ProtectedRoute} from '../../common/auth/ProtectedRoute';
import {RegisterPage} from '../../pages/Register';
import {TaskDetailPage} from '../../features/tasks/TaskDetailPage';
import {TaskPage} from '../../features/tasks/TaskPage';
import TeamPage from '../../features/team/TeamPage';
import {GanttPage} from '../../features/gantt/GanttPage';
import {HomeRoute} from '../HomeRoute';
import {ErrorBoundary} from '../../common/components/ErrorBoundary';
import {AppHeader} from '../../common/components/AppHeader';

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <BrowserRouter>
          <AppHeader/>
          <Routes>
            <Route path="/login" element={<LoginPage/>}/>
            <Route path="/register" element={<RegisterPage/>}/>
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <HomeRoute/>
                </ProtectedRoute>
              }
            />
            <Route
              path="/tasks"
              element={
                <ProtectedRoute>
                  <TaskPage/>
                </ProtectedRoute>
              }
            />
            <Route
              path="/tasks/:jiraId"
              element={
                <ProtectedRoute>
                  <TaskDetailPage/>
                </ProtectedRoute>
              }
            />
            <Route
              path="/plan"
              element={
                <ProtectedRoute>
                  <GanttPage/>
                </ProtectedRoute>
              }
            />
            <Route
              path="/team"
              element={
                <ProtectedRoute>
                  <TeamPage/>
                </ProtectedRoute>
              }
            />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;
