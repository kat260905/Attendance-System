import { useState, useEffect } from 'react';
import { adminDashboardAPI, systemSettingsAPI } from '../services/api';
import Select from "react-select";
import {
    Users, GraduationCap, TrendingUp, Calendar, RefreshCw,
    AlertTriangle, Clock, ShieldAlert, ChevronDown, ChevronUp,
    Settings, Play, Pause // Added icons for settings
} from 'lucide-react';
import {
    BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
    Tooltip, ResponsiveContainer, Cell, ReferenceLine
} from 'recharts';
import LoadingSpinner from '../components/LoadingSpinner';

export default function AdminDashboard() {
    const [summary, setSummary] = useState(null);
    const [deptAttendance, setDeptAttendance] = useState([]);
    const [yearTrend, setYearTrend] = useState([]);
    const [facultyPerformance, setFacultyPerformance] = useState([]);
    const [alerts, setAlerts] = useState(null);
    const [loading, setLoading] = useState(true);
    const [expandedAlert, setExpandedAlert] = useState('unmarked');
    const [selectedDepartment, setSelectedDepartment] = useState('');
    const [schedulerEnabled, setSchedulerEnabled] = useState(true);
    const [togglingScheduler, setTogglingScheduler] = useState(false);

    useEffect(() => {
        loadDashboardData();
    }, []);

    const loadDashboardData = async () => {
        setLoading(true);
        try {
            const [summaryRes, deptRes, yearRes, facultyRes, alertsRes, settingsRes] = await Promise.all([
                adminDashboardAPI.getSummary(),
                adminDashboardAPI.getDepartmentAttendance(),
                adminDashboardAPI.getYearWiseTrend(),
                adminDashboardAPI.getFacultyPerformance(),
                adminDashboardAPI.getAlerts(),
                systemSettingsAPI.getSettings().catch(() => ({ data: { is_auto_generate_sessions: true } })) // graceful fallback
            ]);

            setSummary(summaryRes.data);
            setDeptAttendance(deptRes.data);
            setYearTrend(yearRes.data);
            setFacultyPerformance(facultyRes.data);
            setAlerts(alertsRes.data);
            if (settingsRes.data) {
                setSchedulerEnabled(settingsRes.data.is_auto_generate_sessions);
            }

            if (facultyRes.data?.length > 0) {
                const depts = [...new Set(facultyRes.data.map(f => f.department).filter(Boolean))].sort();
                setSelectedDepartment(prev => prev || (depts.length > 0 ? depts[0] : ''));
            }
        } catch (err) {
            console.error('Failed to load admin dashboard data:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleToggleScheduler = async () => {
        try {
            setTogglingScheduler(true);
            const newState = !schedulerEnabled;
            const res = await systemSettingsAPI.toggleScheduler({ is_auto_generate_sessions: newState });
            if (res.data && res.data.settings) {
                setSchedulerEnabled(res.data.settings.is_auto_generate_sessions);
            } else {
                // local fallback if api structure slightly differs
                setSchedulerEnabled(newState);
            }
        } catch (error) {
            console.error("Failed to toggle scheduler", error);
            alert("Failed to toggle scheduler.");
        } finally {
            setTogglingScheduler(false);
        }
    };

    const toggleAlert = (section) => {
        setExpandedAlert(expandedAlert === section ? null : section);
    };

    if (loading) {
        return <LoadingSpinner text="Loading admin analytics..." />;
    }

    const kpiCards = [
        {
            title: 'Total Students',
            value: summary?.total_students || 0,
            icon: GraduationCap,
            color: 'blue',
            bgColor: 'bg-blue-100',
            textColor: 'text-blue-600'
        },
        {
            title: 'Total Faculty',
            value: summary?.total_faculty || 0,
            icon: Users,
            color: 'purple',
            bgColor: 'bg-purple-100',
            textColor: 'text-purple-600'
        },
        {
            title: 'College Avg Attendance',
            value: `${summary?.college_avg_attendance || 0}%`,
            icon: TrendingUp,
            color: 'green',
            bgColor: 'bg-green-100',
            textColor: 'text-green-600'
        },
        {
            title: 'Classes Conducted Today',
            value: summary?.classes_today || 0,
            icon: Calendar,
            color: 'amber',
            bgColor: 'bg-amber-100',
            textColor: 'text-amber-600'
        }
    ];

    return (
        <div className="min-h-screen bg-gray-50 p-6">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <div className="flex justify-between items-center">
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
                            <p className="text-gray-600 mt-2">Institutional analytics & monitoring</p>
                        </div>
                        <div className="flex gap-4">
                            <button
                                onClick={handleToggleScheduler}
                                disabled={togglingScheduler}
                                className={`inline-flex items-center gap-2 px-4 py-2 border rounded-lg transition-colors ${
                                    schedulerEnabled 
                                        ? "bg-green-50 text-green-700 border-green-200 hover:bg-green-100" 
                                        : "bg-red-50 text-red-700 border-red-200 hover:bg-red-100"
                                }`}
                                title={schedulerEnabled ? "Scheduler is currently generating weekly classes automatically." : "Scheduler is paused. Weekly classes are NOT being generated."}
                            >
                                {togglingScheduler ? (
                                    <RefreshCw size={18} className="animate-spin" />
                                ) : schedulerEnabled ? (
                                    <Pause size={18} />
                                ) : (
                                    <Play size={18} />
                                )}
                                {schedulerEnabled ? "Pause Scheduler" : "Start Scheduler"}
                            </button>
                        </div>
                    </div>
                </div>

                {/* KPI Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                    {kpiCards.map((card, idx) => {
                        const Icon = card.icon;
                        return (
                            <div key={idx} className="bg-white rounded-lg shadow p-6 hover:shadow-md transition-shadow">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm font-medium text-gray-600">{card.title}</p>
                                        <p className="text-2xl font-bold text-gray-900 mt-2">{card.value}</p>
                                    </div>
                                    <div className={`${card.bgColor} rounded-full p-3`}>
                                        <Icon className={card.textColor} size={20} />
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Charts Section */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                    {/* Department-wise Attendance - Bar Chart */}
                    <div className="bg-white rounded-lg shadow p-6">
                        <h3 className="text-lg font-bold text-gray-900 mb-4">Department-wise Attendance</h3>
                        <div className="h-72">
                            {deptAttendance.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart
                                        data={deptAttendance}
                                        margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
                                    >
                                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                                        <XAxis
                                            dataKey="department"
                                            tick={{ fontSize: 11, fill: '#6b7280' }}
                                            axisLine={{ stroke: '#d1d5db' }}
                                        />
                                        <YAxis
                                            domain={[0, 100]}
                                            tick={{ fontSize: 12, fill: '#6b7280' }}
                                            axisLine={{ stroke: '#d1d5db' }}
                                            tickFormatter={(v) => `${v}%`}
                                        />
                                        <Tooltip
                                            formatter={(value, name) => [`${Number(value).toFixed(1)}%`, 'Avg Attendance']}
                                            contentStyle={{
                                                backgroundColor: '#fff',
                                                border: '1px solid #e5e7eb',
                                                borderRadius: '8px',
                                                boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)'
                                            }}
                                        />
                                        <ReferenceLine
                                            y={75}
                                            stroke="#ef4444"
                                            strokeDasharray="5 5"
                                            label={{ value: '75%', position: 'right', fontSize: 11, fill: '#ef4444' }}
                                        />
                                        <Bar dataKey="avg_attendance" radius={[6, 6, 0, 0]} barSize={50}>
                                            {deptAttendance.map((entry, index) => (
                                                <Cell
                                                    key={`cell-${index}`}
                                                    fill={entry.avg_attendance >= 75 ? '#6399ef' : '#f36e6e'}
                                                />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="h-full flex items-center justify-center">
                                    <p className="text-gray-500">No department data available</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Year-wise Trend - Line Chart */}
                    <div className="bg-white rounded-lg shadow p-6">
                        <h3 className="text-lg font-bold text-gray-900 mb-4">Year-wise Attendance Trend</h3>
                        <div className="h-72">
                            {yearTrend.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart
                                        data={yearTrend}
                                        margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
                                    >
                                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                                        <XAxis
                                            dataKey="label"
                                            tick={{ fontSize: 12, fill: '#6b7280' }}
                                            axisLine={{ stroke: '#d1d5db' }}
                                        />
                                        <YAxis
                                            domain={[0, 100]}
                                            tick={{ fontSize: 12, fill: '#6b7280' }}
                                            axisLine={{ stroke: '#d1d5db' }}
                                            tickFormatter={(v) => `${v}%`}
                                        />
                                        <Tooltip
                                            formatter={(value) => [`${Number(value).toFixed(1)}%`, 'Avg Attendance']}
                                            contentStyle={{
                                                backgroundColor: '#fff',
                                                border: '1px solid #e5e7eb',
                                                borderRadius: '8px',
                                                boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)'
                                            }}
                                        />
                                        <ReferenceLine
                                            y={75}
                                            stroke="#ef4444"
                                            strokeDasharray="5 5"
                                            label={{ value: '75% threshold', position: 'right', fontSize: 11, fill: '#ef4444' }}
                                        />
                                        <Line
                                            type="monotone"
                                            dataKey="avg_attendance"
                                            stroke="#8b5cf6"
                                            strokeWidth={3}
                                            dot={{ r: 6, fill: '#8b5cf6', strokeWidth: 2, stroke: '#fff' }}
                                            activeDot={{ r: 8, fill: '#7c3aed', stroke: '#fff', strokeWidth: 2 }}
                                        />
                                    </LineChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="h-full flex items-center justify-center">
                                    <p className="text-gray-500">No year-wise data available</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Faculty Performance Table */}
                <div className="bg-white rounded-lg shadow mb-8">
                    <div className="p-6 border-b border-gray-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div>
                            <h2 className="text-xl font-bold text-gray-900">Faculty Performance</h2>
                            <p className="text-sm text-gray-600 mt-1">Overview of faculty members</p>
                        </div>
                        {(() => {
                            const departments = [...new Set(facultyPerformance.map(f => f.department).filter(Boolean))].sort();
                            if (departments.length <= 1) return null;
                            return (
                                <Select
                                      value={selectedDepartment ? { value: selectedDepartment, label: selectedDepartment } : null}
                                      onChange={(opt) => setSelectedDepartment(opt ? opt.value : 'All')}
                                      options={[{ value: 'All', label: 'All Departments' }, ...departments.map(d => ({ value: d, label: d }))]}
                                      isClearable={false}
                                      styles={{
                                        control: (base) => ({
                                          ...base,
                                          minHeight: "42px",
                                          minWidth: "180px",
                                          borderRadius: "0.5rem",
                                          borderColor: "#d1d5db"
                                        })
                                      }}
                                  />
                            );
                        })()}
                    </div>

                    {(() => {
                        const displayedFaculties = facultyPerformance.filter(f => f.department === selectedDepartment);

                        return displayedFaculties.length > 0 ? (
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead className="bg-gray-50 border-b border-gray-200">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Faculty</th>
                                            <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Department</th>
                                            <th className="px-6 py-3 text-center text-sm font-semibold text-gray-700">Classes Taken</th>
                                            <th className="px-6 py-3 text-center text-sm font-semibold text-gray-700">Avg Attendance %</th>
                                            <th className="px-6 py-3 text-center text-sm font-semibold text-gray-700">Missed Entries</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {displayedFaculties.map((faculty, idx) => (
                                            <tr
                                                key={idx}
                                                className={`border-b border-gray-200 hover:bg-gray-50 transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                                                    }`}
                                            >
                                                <td className="px-6 py-4 text-sm font-medium text-gray-900">
                                                    {faculty.faculty_name}
                                                </td>
                                                <td className="px-6 py-4 text-sm text-gray-600">
                                                    {faculty.department}
                                                </td>
                                                <td className="px-6 py-4 text-center text-sm text-gray-900">
                                                    {faculty.classes_taken}
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    <span
                                                        className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold ${faculty.avg_attendance >= 75
                                                            ? 'bg-green-100 text-green-800'
                                                            : 'bg-red-100 text-red-800'
                                                            }`}
                                                    >
                                                        {faculty.avg_attendance.toFixed(1)}%
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    <span
                                                        className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold ${faculty.missed_entries === 0
                                                            ? 'bg-green-100 text-green-800'
                                                            : faculty.missed_entries <= 3
                                                                ? 'bg-yellow-100 text-yellow-800'
                                                                : 'bg-red-100 text-red-800'
                                                            }`}
                                                    >
                                                        {faculty.missed_entries}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <div className="p-6 text-center text-gray-500">
                                <p>No faculty data available for the selected department.</p>
                            </div>
                        );
                    })()}
                </div>

                {/* Alerts Panel */}
                <div className="bg-white rounded-lg shadow mb-8">
                    <div className="p-6 border-b border-gray-200">
                        <div className="flex items-center gap-2">
                            <ShieldAlert className="text-red-500" size={22} />
                            <h2 className="text-xl font-bold text-gray-900">Alerts Panel</h2>
                        </div>
                        <p className="text-sm text-gray-600 mt-1">Issues requiring attention</p>
                    </div>

                    <div className="divide-y divide-gray-200">
                        {/* Departments Below Threshold */}
                        <div>
                            <button
                                onClick={() => toggleAlert('departments')}
                                className="w-full px-6 py-4 flex justify-between items-center hover:bg-gray-50 transition-colors"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="bg-red-100 rounded-full p-2">
                                        <AlertTriangle className="text-red-600" size={18} />
                                    </div>
                                    <div className="text-left">
                                        <p className="text-sm font-semibold text-gray-900">Departments Below 75% Threshold</p>
                                        <p className="text-xs text-gray-500">
                                            {alerts?.low_departments?.length || 0} department(s) flagged
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    {alerts?.low_departments?.length > 0 && (
                                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-800">
                                            {alerts.low_departments.length}
                                        </span>
                                    )}
                                    {expandedAlert === 'departments' ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                                </div>
                            </button>
                            {expandedAlert === 'departments' && (
                                <div className="px-6 pb-4">
                                    {alerts?.low_departments?.length > 0 ? (
                                        <div className="space-y-2">
                                            {alerts.low_departments.map((dept, idx) => (
                                                <div key={idx} className="flex justify-between items-center bg-red-50 rounded-lg px-4 py-3">
                                                    <span className="text-sm font-medium text-gray-900">{dept.department}</span>
                                                    <span className="text-sm font-semibold text-red-700">{dept.attendance}%</span>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-sm text-green-600 py-2">✓ All departments above 75% threshold</p>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Classes Not Marked Today */}
                        <div>
                            <button
                                onClick={() => toggleAlert('unmarked')}
                                className="w-full px-6 py-4 flex justify-between items-center hover:bg-gray-50 transition-colors"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="bg-yellow-100 rounded-full p-2">
                                        <Clock className="text-yellow-600" size={18} />
                                    </div>
                                    <div className="text-left">
                                        <p className="text-sm font-semibold text-gray-900">Classes Not Marked Today</p>
                                        <p className="text-xs text-gray-500">
                                            {alerts?.unmarked_classes?.length || 0} class(es) pending
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    {alerts?.unmarked_classes?.length > 0 && (
                                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-800">
                                            {alerts.unmarked_classes.length}
                                        </span>
                                    )}
                                    {expandedAlert === 'unmarked' ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                                </div>
                            </button>
                            {expandedAlert === 'unmarked' && (
                                <div className="px-6 pb-4">
                                    {alerts?.unmarked_classes?.length > 0 ? (
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-sm">
                                                <thead>
                                                    <tr className="text-left text-gray-600">
                                                        <th className="pb-2 font-semibold">Subject</th>
                                                        <th className="pb-2 font-semibold">Class</th>
                                                        <th className="pb-2 font-semibold">Faculty</th>
                                                        <th className="pb-2 font-semibold">Time</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {alerts.unmarked_classes.map((cls, idx) => (
                                                        <tr key={idx} className="border-t border-gray-100">
                                                            <td className="py-2 text-gray-900">{cls.subject}</td>
                                                            <td className="py-2 text-gray-600">{cls.class}</td>
                                                            <td className="py-2 text-gray-600">{cls.faculty}</td>
                                                            <td className="py-2 text-gray-600">{cls.time}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    ) : (
                                        <p className="text-sm text-green-600 py-2">✓ All classes marked for today</p>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* High Defaulter Batches */}
                        <div>
                            <button
                                onClick={() => toggleAlert('defaulters')}
                                className="w-full px-6 py-4 flex justify-between items-center hover:bg-gray-50 transition-colors"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="bg-orange-100 rounded-full p-2">
                                        <Users className="text-orange-600" size={18} />
                                    </div>
                                    <div className="text-left">
                                        <p className="text-sm font-semibold text-gray-900">High Defaulter Batches</p>
                                        <p className="text-xs text-gray-500">
                                            {alerts?.high_defaulter_batches?.length || 0} batch(es) with defaulters
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    {alerts?.high_defaulter_batches?.length > 0 && (
                                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold bg-orange-100 text-orange-800">
                                            {alerts.high_defaulter_batches.length}
                                        </span>
                                    )}
                                    {expandedAlert === 'defaulters' ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                                </div>
                            </button>
                            {expandedAlert === 'defaulters' && (
                                <div className="px-6 pb-4">
                                    {alerts?.high_defaulter_batches?.length > 0 ? (
                                        <div className="space-y-2">
                                            {alerts.high_defaulter_batches.map((batch, idx) => (
                                                <div key={idx} className="flex justify-between items-center bg-orange-50 rounded-lg px-4 py-3">
                                                    <div>
                                                        <span className="text-sm font-medium text-gray-900">{batch.class}</span>
                                                        <span className="text-xs text-gray-500 ml-2">
                                                            ({batch.defaulter_count}/{batch.total_students} students)
                                                        </span>
                                                    </div>
                                                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold bg-orange-200 text-orange-900">
                                                        {batch.percentage}% defaulters
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-sm text-green-600 py-2">✓ No high-defaulter batches found</p>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
