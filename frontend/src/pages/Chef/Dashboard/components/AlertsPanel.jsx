import React from 'react';
import { FaExclamationTriangle, FaInfoCircle, FaCheckCircle } from 'react-icons/fa';

const AlertsPanel = ({ alerts, loading }) => {
  const getAlertIcon = (type) => {
    switch (type) {
      case 'warning':
        return <FaExclamationTriangle />;
      case 'info':
        return <FaInfoCircle />;
      case 'success':
        return <FaCheckCircle />;
      default:
        return <FaInfoCircle />;
    }
  };

  if (loading) {
    return (
      <div className="alerts-loading">
        {[1, 2, 3].map(i => (
          <div key={i} className="alert-skeleton"></div>
        ))}
      </div>
    );
  }

  if (!alerts || alerts.length === 0) {
    return (
      <div className="alerts-empty">
        <FaCheckCircle size={24} />
        <p>Không có thông báo mới</p>
      </div>
    );
  }

  return (
    <div className="alerts-panel">
      {alerts.map((alert, index) => (
        <div key={index} className={`alert-item ${alert.type} ${alert.priority}`}>
          <div className="alert-icon">
            {getAlertIcon(alert.type)}
          </div>
          <div className="alert-content">
            <p className="alert-message">{alert.message}</p>
            <span className="alert-time">Vừa xong</span>
          </div>
        </div>
      ))}
    </div>
  );
};

export default AlertsPanel;
