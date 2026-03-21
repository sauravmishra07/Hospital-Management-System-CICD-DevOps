import React, { useContext, useEffect, useState } from "react";
import { Context } from "../main";
import { Navigate } from "react-router-dom";
import axios from "axios";
import { toast } from "react-toastify";
import { GoCheckCircleFill } from "react-icons/go";
import { AiFillCloseCircle } from "react-icons/ai";

const Dashboard = () => {
  const [appointments, setAppointments] = useState([]);

  useEffect(() => {
    const fetchAppointments = async () => {
      try {
        const { data } = await axios.get(
          "http://localhost:5000/api/v1/appointment/getall",
          { withCredentials: true }
        );
        setAppointments(data.appointments);
      } catch (error) {
        setAppointments([]);
      }
    };
    fetchAppointments();
  }, []);

  const handleUpdateStatus = async (appointmentId, status) => {
    try {
      const { data } = await axios.put(
        `http://localhost:5000/api/v1/appointment/update/${appointmentId}`,
        { status },
        { withCredentials: true }
      );

      setAppointments((prev) =>
        prev.map((appt) =>
          appt._id === appointmentId ? { ...appt, status } : appt
        )
      );

      toast.success(data.message);
    } catch (error) {
      toast.error(error.response?.data?.message || "Error updating");
    }
  };

  const { isAuthenticated, admin } = useContext(Context);
  if (!isAuthenticated) return <Navigate to={"/login"} />;

  const getStatusStyle = (status) => {
    switch (status) {
      case "Accepted":
        return "bg-green-100 text-green-700";
      case "Rejected":
        return "bg-red-100 text-red-700";
      default:
        return "bg-yellow-100 text-yellow-700";
    }
  };

  return (
    <section className="min-h-screen bg-gray-100 p-6">
      
      {/* Header */}
      <div className="grid md:grid-cols-3 gap-6 mb-6">
        
        {/* Profile Card */}
        <div className="col-span-2 bg-white rounded-xl shadow p-5 flex items-center gap-5">
          <img
            src="/doc.png"
            alt="doc"
            className="w-20 h-20 rounded-full border"
          />
          <div>
            <p className="text-gray-500">Welcome back 👋</p>
            <h2 className="text-2xl font-semibold">
              {admin?.firstName} {admin?.lastName}
            </h2>
            <p className="text-sm text-gray-400 mt-1">
              Manage appointments and doctors easily.
            </p>
          </div>
        </div>

        {/* Stats */}
        <div className="bg-blue-500 text-white rounded-xl shadow p-5">
          <p className="text-sm">Total Appointments</p>
          <h2 className="text-3xl font-bold mt-2">
            {appointments.length}
          </h2>
        </div>

        <div className="bg-purple-500 text-white rounded-xl shadow p-5">
          <p className="text-sm">Registered Doctors</p>
          <h2 className="text-3xl font-bold mt-2">10</h2>
        </div>
      </div>

      {/* Table Section */}
      <div className="bg-white rounded-xl shadow p-5">
        <h3 className="text-xl font-semibold mb-4">Appointments</h3>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            
            <thead className="bg-gray-100 text-gray-600 uppercase text-xs">
              <tr>
                <th className="p-3">Patient</th>
                <th className="p-3">Date</th>
                <th className="p-3">Doctor</th>
                <th className="p-3">Department</th>
                <th className="p-3">Status</th>
                <th className="p-3 text-center">Visited</th>
              </tr>
            </thead>

            <tbody>
              {appointments.length > 0 ? (
                appointments.map((appt) => (
                  <tr
                    key={appt._id}
                    className="border-b hover:bg-gray-50 transition"
                  >
                    <td className="p-3 font-medium">
                      {appt.firstName} {appt.lastName}
                    </td>

                    <td className="p-3 text-gray-600">
                      {appt.appointment_date.substring(0, 16)}
                    </td>

                    <td className="p-3">
                      {appt.doctor.firstName} {appt.doctor.lastName}
                    </td>

                    <td className="p-3">{appt.department}</td>

                    {/* Status Dropdown */}
                    <td className="p-3">
                      <select
                        value={appt.status}
                        onChange={(e) =>
                          handleUpdateStatus(appt._id, e.target.value)
                        }
                        className={`px-2 py-1 rounded-md text-xs font-medium outline-none ${getStatusStyle(
                          appt.status
                        )}`}
                      >
                        <option value="Pending">Pending</option>
                        <option value="Accepted">Accepted</option>
                        <option value="Rejected">Rejected</option>
                      </select>
                    </td>

                    {/* Visited */}
                    <td className="p-3 text-center">
                      {appt.hasVisited ? (
                        <GoCheckCircleFill className="text-green-500 text-lg mx-auto" />
                      ) : (
                        <AiFillCloseCircle className="text-red-500 text-lg mx-auto" />
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" className="text-center p-5 text-gray-500">
                    No Appointments Found
                  </td>
                </tr>
              )}
            </tbody>

          </table>
        </div>
      </div>
    </section>
  );
};

export default Dashboard;
