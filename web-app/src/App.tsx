import './App.css';

// Component imports (we'll create these next)
import FDLEditor from './components/FDLEditor';

function App() {
  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 transition-colors">
      <FDLEditor />
    </div>
  );
}

export default App;
