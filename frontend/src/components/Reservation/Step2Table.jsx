import React, { useEffect, useState } from 'react';
import axios from '../../utils/axios.customize';

export default function Step2Table({ form, setForm, next, prev }) {
    const [tables, setTables] = useState([]);
    const [err, setErr] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const fetchAvailableTables = async () => {
            if (!form.area_id || !form.date || !form.time) {
                setTables([]);
                return;
            }
            try {
                setLoading(true);
                setErr('');
                const response = await axios.get('/reservations/available-tables', {
                    params: {
                        area_id: form.area_id,
                        date: form.date,
                        time: form.time,
                        guest_count: form.guest_count
                    }
                });
                if (response?.data?.success && Array.isArray(response.data.data)) {
                    setTables(response.data.data);
                } else {
                    console.error('Invalid response format:', response);
                    setTables([]);
                    setErr('Không thể tải danh sách bàn');
                }
            } catch (error) {
                console.error('Error fetching tables:', error);
                setTables([]);
                setErr(error.response?.data?.message || 'Có lỗi xảy ra khi tải danh sách bàn');
            } finally {
                setLoading(false);
            }
        };
        fetchAvailableTables();
    }, [form.area_id, form.date, form.time, form.guest_count]);

    const handleNext = () => {
        if (!form.table_id) {
            setErr('Vui lòng chọn bàn!');
            return;
        }
        setErr('');
        next();
    };

    return (
        <div className="reservation-step2-wrapper">
            <div className="reservation-card">
                <h2 className="reservation-title">Chọn bàn phù hợp</h2>
                {loading ? (
                    <div className="reservation-loading">Đang tải danh sách bàn...</div>
                ) : err ? (
                    <div className="reservation-error">{err}</div>
                ) : tables.length === 0 ? (
                    <div className="reservation-error">Không có bàn phù hợp!</div>
                ) : (
                    <div className="table-list">
                        {tables.map(t => (
                            <label key={t._id} className={`table-radio-label${form.table_id === t._id ? ' selected' : ''}`}>
                                <input
                                    type="radio"
                                    name="table_id"
                                    value={t._id}
                                    checked={form.table_id === t._id}
                                    onChange={() => setForm({ ...form, table_id: t._id })}
                                />
                                <div className="table-info">
                                    <div className="table-name">{t.name}</div>
                                    <div className="table-type">{t.type}</div>
                                    <div className="table-capacity">{t.capacity} người</div>
                                </div>
                            </label>
                        ))}
                    </div>
                )}
                <div className="reservation-step2-btns">
                    <button className="reservation-btn" onClick={prev} disabled={loading}>
                        Quay lại
                    </button>
                    <button
                        className="reservation-btn"
                        onClick={handleNext}
                        style={{ marginLeft: 12 }}
                        disabled={loading || !form.table_id}
                    >
                        Tiếp theo
                    </button>
                </div>
            </div>
            <style>{`
                .reservation-step2-wrapper {
                    min-height: 70vh;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    background: #f7f8fa;
                }
                .reservation-card {
                    background: #fff;
                    border-radius: 18px;
                    box-shadow: 0 4px 24px 0 rgba(0,0,0,0.08);
                    padding: 36px 32px 28px 32px;
                    max-width: 420px;
                    width: 100%;
                    margin: 32px 0;
                }
                .reservation-title {
                    text-align: center;
                    font-size: 1.5rem;
                    font-weight: 700;
                    margin-bottom: 24px;
                    color: #1a1a1a;
                }
                .reservation-loading {
                    color: #e44d26;
                    text-align: center;
                    margin-bottom: 10px;
                }
                .reservation-error {
                    color: #fff;
                    background: #e44d26;
                    padding: 10px 0;
                    border-radius: 6px;
                    text-align: center;
                    margin-bottom: 10px;
                    font-weight: 500;
                }
                .table-list {
                    display: flex;
                    flex-direction: column;
                    gap: 14px;
                    margin-bottom: 18px;
                }
                .table-radio-label {
                    display: flex;
                    align-items: center;
                    background: #fafbfc;
                    border: 1.5px solid #e0e0e0;
                    border-radius: 10px;
                    padding: 14px 16px;
                    cursor: pointer;
                    transition: border 0.2s, box-shadow 0.2s;
                    box-shadow: 0 1px 4px 0 rgba(228,77,38,0.04);
                }
                .table-radio-label.selected {
                    border: 2px solid #e44d26;
                    background: #fff7f3;
                    box-shadow: 0 2px 8px 0 rgba(228,77,38,0.10);
                }
                .table-radio-label input[type="radio"] {
                    accent-color: #e44d26;
                    width: 22px;
                    height: 22px;
                    margin-right: 18px;
                }
                .table-info {
                    display: flex;
                    flex-direction: column;
                    gap: 2px;
                }
                .table-name {
                    font-weight: 600;
                    font-size: 1.1rem;
                    color: #222;
                }
                .table-type {
                    color: #666;
                    font-size: 0.98rem;
                }
                .table-capacity {
                    color: #e44d26;
                    font-size: 0.98rem;
                    font-weight: 500;
                }
                .reservation-step2-btns {
                    display: flex;
                    justify-content: space-between;
                    margin-top: 18px;
                }
                .reservation-btn {
                    width: 48%;
                    background: linear-gradient(90deg, #ff9800 0%, #e44d26 100%);
                    color: #fff;
                    font-size: 1.1rem;
                    font-weight: 600;
                    border: none;
                    border-radius: 8px;
                    padding: 14px 0;
                    cursor: pointer;
                    box-shadow: 0 2px 8px 0 rgba(228,77,38,0.08);
                    transition: background 0.2s, box-shadow 0.2s;
                }
                .reservation-btn:hover {
                    background: linear-gradient(90deg, #e44d26 0%, #ff9800 100%);
                    box-shadow: 0 4px 16px 0 rgba(228,77,38,0.13);
                }
                @media (max-width: 600px) {
                    .reservation-card {
                        padding: 18px 6vw 18px 6vw;
                        max-width: 98vw;
                    }
                }
            `}</style>
        </div>
    );
}
