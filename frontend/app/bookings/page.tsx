"use client";

import { useState } from "react";
import Link from "next/link";
import {
  HiOutlineArrowLeft,
  HiOutlineCalendarDays,
  HiOutlineClock,
  HiOutlineUsers,
  HiOutlineChevronLeft,
  HiOutlineChevronRight,
} from "react-icons/hi2";

const bookings = [
  { id: 1, name: "Johnson Family", guests: 6, date: "Jun 20", time: "7:00 PM", table: "T-06", status: "Confirmed", phone: "+1 555-0101" },
  { id: 2, name: "Mike & Sarah", guests: 2, date: "Jun 20", time: "7:30 PM", table: "T-03", status: "Confirmed", phone: "+1 555-0102" },
  { id: 3, name: "Corporate Event", guests: 10, date: "Jun 21", time: "6:00 PM", table: "T-12", status: "Confirmed", phone: "+1 555-0103" },
  { id: 4, name: "Brown Party", guests: 4, date: "Jun 21", time: "8:00 PM", table: "T-08", status: "Pending", phone: "+1 555-0104" },
  { id: 5, name: "Kim Anniversary", guests: 2, date: "Jun 22", time: "7:00 PM", table: "T-01", status: "Confirmed", phone: "+1 555-0105" },
  { id: 6, name: "Davis Reunion", guests: 8, date: "Jun 22", time: "6:30 PM", table: "T-12", status: "Pending", phone: "+1 555-0106" },
  { id: 7, name: "Solo Dinner", guests: 1, date: "Jun 23", time: "7:30 PM", table: "T-10", status: "Confirmed", phone: "+1 555-0107" },
  { id: 8, name: "Wilson Birthday", guests: 5, date: "Jun 24", time: "8:00 PM", table: "T-06", status: "Confirmed", phone: "+1 555-0108" },
];

const dates = ["Jun 20", "Jun 21", "Jun 22", "Jun 23", "Jun 24", "Jun 25", "Jun 26"];

const statusColors: Record<string, string> = {
  Confirmed: "bg-brand-500/15 text-brand-400",
  Pending: "bg-amber-500/15 text-amber-400",
  Cancelled: "bg-red-500/15 text-red-400",
};

export default function BookingsPage() {
  const [selectedDate, setSelectedDate] = useState("Jun 20");

  const filtered = bookings.filter((b) => b.date === selectedDate);

  return (
    <div className="min-h-screen bg-surface-950">
      <header className="flex items-center gap-4 border-b border-border px-6 py-4">
        <Link
          href="/dashboard"
          className="rounded-xl p-2 text-text-muted transition-colors hover:bg-[var(--glass-border)] hover:text-brand-primary"
        >
          <HiOutlineArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex items-center gap-2">
          <HiOutlineCalendarDays className="h-5 w-5 text-brand-400" />
          <h1 className="text-lg font-bold text-text-primary">Bookings</h1>
        </div>
        <button className="btn-primary ml-auto flex items-center gap-2 text-sm">
          <HiOutlineCalendarDays className="h-4 w-4" />
          New Booking
        </button>
      </header>

      <div className="p-6">
        {/* Date Picker Concept */}
        <div className="mb-6">
          <div className="flex items-center gap-2">
            <button className="rounded-xl p-2 text-text-muted hover:bg-[var(--glass-border)] hover:text-brand-primary">
              <HiOutlineChevronLeft className="h-5 w-5" />
            </button>
            <div className="flex gap-2 overflow-x-auto">
              {dates.map((date) => (
                <button
                  key={date}
                  onClick={() => setSelectedDate(date)}
                  className={`whitespace-nowrap rounded-xl px-4 py-2.5 text-sm font-medium transition-all ${
                    selectedDate === date
                      ? "bg-brand-500/20 text-brand-400"
                      : "text-text-muted hover:bg-[var(--glass-border)] hover:text-brand-primary"
                  }`}
                >
                  {date}
                </button>
              ))}
            </div>
            <button className="rounded-xl p-2 text-text-muted hover:bg-[var(--glass-border)] hover:text-brand-primary">
              <HiOutlineChevronRight className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Bookings List */}
        <div className="glass-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="px-5 py-4 font-medium text-text-muted">Guest</th>
                  <th className="px-5 py-4 font-medium text-text-muted">Date & Time</th>
                  <th className="px-5 py-4 font-medium text-text-muted">Party Size</th>
                  <th className="px-5 py-4 font-medium text-text-muted">Table</th>
                  <th className="px-5 py-4 font-medium text-text-muted">Status</th>
                  <th className="px-5 py-4 font-medium text-text-muted">Phone</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filtered.length > 0 ? (
                  filtered.map((booking) => (
                    <tr key={booking.id} className="text-text-secondary transition-colors hover:bg-[var(--glass-border)]">
                      <td className="px-5 py-4 font-medium text-text-primary">{booking.name}</td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <span>{booking.date}</span>
                          <span className="flex items-center gap-1 text-text-muted">
                            <HiOutlineClock className="h-3.5 w-3.5" />
                            {booking.time}
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <span className="flex items-center gap-1">
                          <HiOutlineUsers className="h-3.5 w-3.5 text-text-muted" />
                          {booking.guests}
                        </span>
                      </td>
                      <td className="px-5 py-4 font-medium text-text-primary">{booking.table}</td>
                      <td className="px-5 py-4">
                        <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColors[booking.status]}`}>
                          {booking.status}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-text-muted">{booking.phone}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="px-5 py-12 text-center text-text-muted">
                      No bookings for {selectedDate}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
