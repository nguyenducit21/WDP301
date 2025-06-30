import React from 'react';

const DateFilter = ({ filter, onChange }) => {
  const timeTypes = [
    { value: 'day', label: 'Theo ngày' },
    { value: 'month', label: 'Theo tháng' },
    { value: 'year', label: 'Theo năm' }
  ];

  const months = [
    'Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6',
    'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12'
  ];

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => currentYear - i);

  const handleTypeChange = (type) => {
    onChange({
      ...filter,
      type,
      period: type === 'month' ? new Date().getMonth() + 1 : currentYear
    });
  };

  const handlePeriodChange = (period) => {
    onChange({
      ...filter,
      period: parseInt(period)
    });
  };

  const handleYearChange = (year) => {
    onChange({
      ...filter,
      year: parseInt(year)
    });
  };

  return (
    <div className="date-filter">
      <div className="filter-group">
        <label>Loại thời gian:</label>
        <select 
          value={filter.type} 
          onChange={(e) => handleTypeChange(e.target.value)}
          className="filter-select"
        >
          {timeTypes.map(type => (
            <option key={type.value} value={type.value}>
              {type.label}
            </option>
          ))}
        </select>
      </div>

      {filter.type === 'month' && (
        <div className="filter-group">
          <label>Tháng:</label>
          <select 
            value={filter.period} 
            onChange={(e) => handlePeriodChange(e.target.value)}
            className="filter-select"
          >
            {months.map((month, index) => (
              <option key={index + 1} value={index + 1}>
                {month}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="filter-group">
        <label>Năm:</label>
        <select 
          value={filter.year} 
          onChange={(e) => handleYearChange(e.target.value)}
          className="filter-select"
        >
          {years.map(year => (
            <option key={year} value={year}>
              {year}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
};

export default DateFilter;
