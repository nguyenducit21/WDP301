import React, { useState } from 'react';
import Step1Info from './Step1Info';
import Step2Table from './Step2Table';
import Step3Menu from './Step3Menu';
import Step4Confirm from './Step4Confirm';

export default function ReservationForm() {
    const [step, setStep] = useState(1);
    const [form, setForm] = useState({
        name: '',
        email: '',
        phone: '',
        date: '',
        time: '',
        guest_count: 1,
        area_id: '',
        table_id: '',
        notes: '',
        pre_order_items: []
    });

    const next = () => setStep(s => s + 1);
    const prev = () => setStep(s => s - 1);

    return (
        <div style={{ maxWidth: 600, margin: '0 auto', background: '#fff', padding: 24, borderRadius: 8 }}>
            <h2 style={{ textAlign: 'center' }}>Đặt bàn online</h2>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 24 }}>
                {['Điền thông tin', 'Chọn bàn', 'Chọn món', 'Xác nhận'].map((label, idx) => (
                    <div key={label} style={{
                        color: step === idx + 1 ? '#fff' : '#333',
                        background: step === idx + 1 ? '#f7b731' : '#eee',
                        borderRadius: '50%',
                        width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}>{idx + 1}</div>
                ))}
            </div>
            {step === 1 && <Step1Info form={form} setForm={setForm} next={next} />}
            {step === 2 && <Step2Table form={form} setForm={setForm} next={next} prev={prev} />}
            {step === 3 && <Step3Menu form={form} setForm={setForm} next={next} prev={prev} />}
            {step === 4 && <Step4Confirm form={form} prev={prev} />}
        </div>
    );
}