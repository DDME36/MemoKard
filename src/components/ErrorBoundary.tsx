import { Component, type ReactNode } from 'react';
import { motion } from 'framer-motion';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-purple-50 to-pink-50 dark:bg-slate-950 p-6">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="max-w-md w-full bg-white dark:bg-slate-800 rounded-3xl shadow-2xl p-8 text-center border border-slate-200 dark:border-slate-700"
          >
            <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-rose-500 to-pink-600 rounded-full flex items-center justify-center">
              <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            
            <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-200 mb-3">
              เกิดข้อผิดพลาด
            </h2>
            
            <p className="text-slate-600 dark:text-slate-400 mb-6">
              ขออภัย เกิดข้อผิดพลาดที่ไม่คาดคิด กรุณาลองรีเฟรชหน้าเว็บ
            </p>

            {this.state.error && (
              <details className="mb-6 text-left">
                <summary className="cursor-pointer text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                  รายละเอียดข้อผิดพลาด
                </summary>
                <pre className="text-xs bg-slate-100 dark:bg-slate-900 p-4 rounded-xl overflow-auto text-rose-600 dark:text-rose-400">
                  {this.state.error.toString()}
                </pre>
              </details>
            )}

            <button
              onClick={() => window.location.reload()}
              className="w-full bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white font-bold py-3 px-6 rounded-xl transition-all shadow-lg hover:shadow-xl"
            >
              รีเฟรชหน้าเว็บ
            </button>
          </motion.div>
        </div>
      );
    }

    return this.props.children;
  }
}
