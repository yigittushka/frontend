"use client";

import { toLocalDateInputValue, addDaysLocal, getMondayOfWeek } from "../../lib/dateUtils";

interface DateRangePickerProps {
    fromDate: string;
    toDate: string;
    onFromChange: (date: string) => void;
    onToChange: (date: string) => void;
    showWeekButtons?: boolean;
}

export default function DateRangePicker({
    fromDate,
    toDate,
    onFromChange,
    onToChange,
    showWeekButtons = true
}: DateRangePickerProps) {
    
    const goToCurrentWeek = () => {
        const monday = getMondayOfWeek(new Date());
        onFromChange(toLocalDateInputValue(monday));
        onToChange(toLocalDateInputValue(addDaysLocal(monday, 6)));
    };
    
    const goToPrevWeek = () => {
        const [year, month, day] = fromDate.split("-").map(Number);
        const currentMonday = getMondayOfWeek(new Date(year, month - 1, day));
        const prevMonday = addDaysLocal(currentMonday, -7);
        onFromChange(toLocalDateInputValue(prevMonday));
        onToChange(toLocalDateInputValue(addDaysLocal(prevMonday, 6)));
    };
    
    const goToNextWeek = () => {
        const [year, month, day] = fromDate.split("-").map(Number);
        const currentMonday = getMondayOfWeek(new Date(year, month - 1, day));
        const nextMonday = addDaysLocal(currentMonday, 7);
        onFromChange(toLocalDateInputValue(nextMonday));
        onToChange(toLocalDateInputValue(addDaysLocal(nextMonday, 6)));
    };

    return (
        <div className="date-range-picker">
            <div className="date-range-inputs">
                <div className="date-input-group">
                    <label className="date-label">От</label>
                    <input
                        className="input"
                        type="date"
                        value={fromDate}
                        onChange={(e) => onFromChange(e.target.value)}
                    />
                </div>
                <div className="date-input-group">
                    <label className="date-label">До</label>
                    <input
                        className="input"
                        type="date"
                        value={toDate}
                        onChange={(e) => onToChange(e.target.value)}
                    />
                </div>
            </div>
            
            {showWeekButtons && (
                <div className="date-range-buttons">
                    <button className="btn btn-sm" onClick={goToCurrentWeek}>
                        Текущая
                    </button>
                    <button className="btn btn-sm" onClick={goToPrevWeek}>
                        ← Пред
                    </button>
                    <button className="btn btn-sm" onClick={goToNextWeek}>
                        След →
                    </button>
                </div>
            )}
        </div>
    );
}
