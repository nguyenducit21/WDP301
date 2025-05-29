import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import TableBookingPage from './pages/TableBookingPage';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/table-booking" element={<TableBookingPage />} />
      </Routes>
    </Router>
  );
}

export default App;
