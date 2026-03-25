import { useEffect, useRef, useState } from "react";
import { CheckCircle, XCircle, X } from "lucide-react";

export default function Toast({ message, onDismiss, duration = 4000 }) {
    const [show, setShow] = useState(false);
    const timerRef = useRef(null);

    useEffect(() => {
        // Clear any existing timer on every message change
        if (timerRef.current) {
            clearTimeout(timerRef.current);
            timerRef.current = null;
        }

        if (message) {
            // Small delay to trigger CSS transition (mount → animate in)
            requestAnimationFrame(() => {
                setShow(true);
            });

            // Auto-dismiss after duration
            if (duration > 0) {
                timerRef.current = setTimeout(() => {
                    setShow(false);
                    // Wait for exit animation, then call onDismiss
                    setTimeout(() => {
                        if (onDismiss) onDismiss();
                    }, 300);
                }, duration);
            }
        } else {
            setShow(false);
        }

        return () => {
            if (timerRef.current) {
                clearTimeout(timerRef.current);
                timerRef.current = null;
            }
        };
    }, [message, duration, onDismiss]);

    const handleDismiss = () => {
        if (timerRef.current) {
            clearTimeout(timerRef.current);
            timerRef.current = null;
        }
        setShow(false);
        setTimeout(() => {
            if (onDismiss) onDismiss();
        }, 300);
    };

    if (!message) return null;

    const isSuccess = message.type === "success";

    return (
        <div
            style={{
                position: "fixed",
                bottom: "1.5rem",
                right: "1.5rem",
                zIndex: 9999,
                maxWidth: "28rem",
                width: "100%",
                transition: "all 0.3s ease-in-out",
                opacity: show ? 1 : 0,
                transform: show ? "translateY(0)" : "translateY(1rem)",
                pointerEvents: show ? "auto" : "none",
            }}
        >
            <div
                style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: "0.75rem",
                    padding: "1rem",
                    borderRadius: "0.75rem",
                    border: `1px solid ${isSuccess ? "#86efac" : "#fca5a5"}`,
                    backgroundColor: isSuccess ? "#f0fdf4" : "#fef2f2",
                    color: isSuccess ? "#166534" : "#991b1b",
                    boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -4px rgba(0,0,0,0.1)",
                }}
            >
                <div style={{ flexShrink: 0, marginTop: "2px" }}>
                    {isSuccess ? (
                        <CheckCircle size={22} color="#22c55e" />
                    ) : (
                        <XCircle size={22} color="#ef4444" />
                    )}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: "0.875rem", fontWeight: 600, margin: 0 }}>
                        {isSuccess ? "Success" : "Error"}
                    </p>
                    <p style={{ fontSize: "0.875rem", margin: 0, marginTop: "2px", opacity: 0.9 }}>
                        {message.text}
                    </p>
                </div>
                <button
                    onClick={handleDismiss}
                    style={{
                        flexShrink: 0,
                        padding: "4px",
                        borderRadius: "50%",
                        border: "none",
                        background: "transparent",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        opacity: 0.6,
                    }}
                    onMouseEnter={(e) => (e.target.style.opacity = 1)}
                    onMouseLeave={(e) => (e.target.style.opacity = 0.6)}
                    aria-label="Dismiss"
                >
                    <X size={16} />
                </button>
            </div>
        </div>
    );
}
