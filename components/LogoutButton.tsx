'use client'

import { useState } from 'react'

export default function LogoutButton({ teamId, className }: { teamId: string, className?: string }) {
    const [showConfirm, setShowConfirm] = useState(false)

    const handleLogout = async () => {
        const { logoutAction } = await import('@/app/actions')
        await logoutAction(teamId)
    }

    return (
        <>
            <button
                onClick={() => setShowConfirm(true)}
                className={className || "fixed top-4 right-4 px-4 py-2 bg-red-900 border border-red-500 text-red-100 font-pixel text-[10px] rounded hover:bg-red-800 transition-colors z-[9999] shadow-[0_0_15px_rgba(239,68,68,0.5)] hover:scale-105 active:scale-95 uppercase tracking-widest"}
            >
                LOG OUT
            </button>

            {showConfirm && (
                <div className="fixed inset-0 z-[99999] bg-black/80 backdrop-blur-md flex items-center justify-center pointer-events-auto p-4 animate-fade-in">
                    <div className="bg-[#1a1a24] border-2 border-red-900 shadow-[0_0_50px_rgba(239,68,68,0.2)] rounded-xl p-8 max-w-sm w-full text-center space-y-6 flex flex-col items-center">
                        <h2 className="text-3xl font-pixel text-red-500 animate-pulse">WARNING</h2>
                        <p className="font-mono text-sm text-gray-300 leading-relaxed text-center">
                            Are you sure you want to log out? <br /><br />
                            Your session will be disconnected.
                        </p>
                        <div className="flex gap-4 justify-center pt-4 w-full">
                            <button
                                onClick={() => setShowConfirm(false)}
                                className="flex-1 py-3 bg-[#2a2b38] border border-gray-600 hover:border-gray-400 text-gray-300 font-pixel text-xs rounded transition-colors uppercase outline-none"
                            >
                                CANCEL
                            </button>
                            <button
                                onClick={handleLogout}
                                className="flex-1 py-3 bg-red-800 hover:bg-red-600 border border-red-500 text-white font-pixel text-xs rounded transition-colors shadow-[0_0_15px_rgba(239,68,68,0.5)] uppercase outline-none"
                            >
                                LOGOUT NOW
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    )
}
