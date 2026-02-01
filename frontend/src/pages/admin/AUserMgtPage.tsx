'use client';

import React, { useState, useEffect } from 'react';
import Sidebar from '../../components/layout/Sidebar';
import { Settings, Trash2, AlertTriangle, X } from 'lucide-react';

interface User {
  id: string;
  name: string;
  email: string;
  role: 'Doctor' | 'Patient' | 'Admin';
  status: 'Active' | 'Inactive';
  inactiveDays?: number;
}

const ITEMS_PER_PAGE = 6;

const AUserMgtPage: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('name');
  const [currentPage, setCurrentPage] = useState(1);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [editFormData, setEditFormData] = useState({
    id: '',
    name: '',
    email: ''
  });

  // Users data from database
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>('');

  // Fetch users from backend on component mount
  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setIsLoading(true);
    setError('');

    try {
      const API_URL = import.meta.env.VITE_API_URL;
      const response = await fetch(`${API_URL}/api/auth/users`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to fetch users');
      }

      setUsers(data.users);
    } catch (err: any) {
      console.error('Error fetching users:', err);
      setError(err.message || 'Failed to load users');
    } finally {
      setIsLoading(false);
    }
  };

  // Filter and sort users
  const filteredUsers = users
    .filter((user) => {
      const matchesSearch =
        user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.id.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesRole =
        roleFilter === 'all' ||
        user.role.toLowerCase() === roleFilter.toLowerCase();

      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'active' && user.status === 'Active') ||
        (statusFilter === 'inactive' && user.status === 'Inactive');

      return matchesSearch && matchesRole && matchesStatus;
    })
    .sort((a, b) => {
      if (sortBy === 'name') {
        return a.name.localeCompare(b.name);
      } else if (sortBy === 'role') {
        return a.role.localeCompare(b.role);
      } else if (sortBy === 'status') {
        return a.status.localeCompare(b.status);
      }
      return 0;
    });

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / ITEMS_PER_PAGE));
  const paginatedUsers = filteredUsers.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, roleFilter, statusFilter, sortBy]);

  // Generate page numbers to display
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (currentPage > 3) pages.push('...');
      for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) {
        pages.push(i);
      }
      if (currentPage < totalPages - 2) pages.push('...');
      pages.push(totalPages);
    }
    return pages;
  };

  // Statistics
  const totalUsers = users.length;
  const activeUsers = users.filter(user => user.status === 'Active').length;
  const doctors = users.filter(user => user.role === 'Doctor').length;
  const patients = users.filter(user => user.role === 'Patient').length;
  const inactiveUsers = users.filter(user => user.status === 'Inactive').length;

  const handleDeleteClick = (user: User) => {
    setSelectedUser(user);
    setShowDeleteDialog(true);
  };

  const handleEditClick = (user: User) => {
    setSelectedUser(user);
    setEditFormData({
      id: user.id,
      name: user.name,
      email: user.email
    });
    setShowEditDialog(true);
  };

  const [isProcessing, setIsProcessing] = useState(false);

  const handleDeleteConfirm = async () => {
    if (!selectedUser) return;

    setIsProcessing(true);
    try {
      const API_URL = import.meta.env.VITE_API_URL;
      const response = await fetch(`${API_URL}/api/auth/users/${selectedUser.id}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to delete user');
      }

      setUsers(prevUsers => prevUsers.filter(user => user.id !== selectedUser.id));
      setShowDeleteDialog(false);
      setSelectedUser(null);
      alert('User deleted successfully');
    } catch (err: any) {
      console.error('Error deleting user:', err);
      alert(`Failed to delete user: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleEditSave = async () => {
    if (!selectedUser) return;

    setIsProcessing(true);
    try {
      const API_URL = import.meta.env.VITE_API_URL;
      const response = await fetch(`${API_URL}/api/auth/users/${selectedUser.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: editFormData.name,
          email: editFormData.email
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to update user');
      }

      setUsers(prevUsers =>
        prevUsers.map(user =>
          user.id === selectedUser.id
            ? { ...user, name: editFormData.name, email: editFormData.email } // Optimistic update
            : user
        )
      );

      setShowEditDialog(false);
      setSelectedUser(null);
      alert('User updated successfully');
    } catch (err: any) {
      console.error('Error updating user:', err);
      alert(`Failed to update user: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <>
      <div className="min-h-screen bg-gray-100 flex">
        {/* Sidebar */}
        <Sidebar userRole="admin" currentPage="user-management" />

        {/* Main Content */}
        <div className="flex-1 p-4 lg:p-8 pt-16 lg:pt-8">
          {/* Header */}
          <div className="flex items-start justify-between mb-6">
            <div>
              <h1 className="text-2xl lg:text-3xl font-bold mb-2">User Management</h1>
              <p className="text-gray-600">Create, View, Edit And Manage User Account</p>
            </div>
            <button
              onClick={() => window.location.href = '/admin/create-user'}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition"
            >
              Create User
              <div className="text-xs font-normal">Add new account</div>
            </button>
          </div>

          {/* Inactive Users Alert */}
          {inactiveUsers > 0 && (
            <div className="bg-yellow-50 border-2 border-yellow-400 rounded-lg p-4 mb-6 flex items-center gap-3">
              <AlertTriangle className="w-6 h-6 text-yellow-600 flex-shrink-0" />
              <div>
                <h3 className="font-bold text-red-600">Inactive Users Alert</h3>
                <p className="text-gray-800">
                  {inactiveUsers} users inactive for more than 365 days - please remove all of their account
                </p>
              </div>
            </div>
          )}

          {/* Statistics Cards */}
          <div className="bg-gray-200 rounded-lg p-6 mb-6">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white rounded-lg p-4 text-center">
                <h3 className="text-sm font-semibold text-gray-600 mb-1">Total Users</h3>
                <p className="text-3xl font-bold text-purple-600">{totalUsers}</p>
              </div>
              <div className="bg-white rounded-lg p-4 text-center">
                <h3 className="text-sm font-semibold text-gray-600 mb-1">Active Users</h3>
                <p className="text-3xl font-bold text-green-600">{activeUsers}</p>
              </div>
              <div className="bg-white rounded-lg p-4 text-center">
                <h3 className="text-sm font-semibold text-gray-600 mb-1">Doctors</h3>
                <p className="text-3xl font-bold text-blue-600">{doctors}</p>
              </div>
              <div className="bg-white rounded-lg p-4 text-center">
                <h3 className="text-sm font-semibold text-gray-600 mb-1">Patients</h3>
                <p className="text-3xl font-bold text-pink-400">{patients}</p>
              </div>
            </div>
          </div>

          {/* Users Table Section */}
          <div className="bg-white rounded-lg shadow-sm">
            {/* Table Header */}
            <div className="p-4 border-b">
              <h2 className="text-xl font-bold mb-4">All Users ({totalUsers})</h2>

              {/* Filters */}
              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  type="text"
                  placeholder="Search by name, email, or ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All Roles</option>
                  <option value="doctor">Doctor</option>
                  <option value="patient">Patient</option>
                  <option value="admin">Admin</option>
                </select>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All Status</option>
                  <option value="active">Active Only</option>
                  <option value="inactive">Inactive Only</option>
                </select>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="name">Sort: Name</option>
                  <option value="role">Sort: Role</option>
                  <option value="status">Sort: Status</option>
                </select>
              </div>

              {/* Results counter */}
              {searchQuery || roleFilter !== 'all' || statusFilter !== 'all' ? (
                <div className="mt-3 text-sm text-gray-600">
                  Showing {filteredUsers.length} of {users.length} users
                </div>
              ) : null}
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              {isLoading ? (
                <div className="py-12 text-center">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  <p className="mt-3 text-gray-600">Loading users...</p>
                </div>
              ) : error ? (
                <div className="py-12 text-center">
                  <p className="text-red-600 mb-2">Error: {error}</p>
                  <button
                    onClick={fetchUsers}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Retry
                  </button>
                </div>
              ) : (
                <table className="w-full">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">User ID</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Name</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Email</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Role</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Status</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {paginatedUsers.length > 0 ? (
                      paginatedUsers.map((user, index) => (
                        <tr key={index} className="hover:bg-gray-50">
                          <td className="px-4 py-4 text-sm text-gray-900">{user.id}</td>
                          <td className="px-4 py-4 text-sm text-gray-900">{user.name}</td>
                          <td className="px-4 py-4 text-sm text-gray-600">{user.email}</td>
                          <td className="px-4 py-4">
                            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${user.role === 'Doctor' ? 'bg-blue-100 text-blue-700' :
                              user.role === 'Patient' ? 'bg-pink-100 text-pink-700' :
                                'bg-purple-100 text-purple-700'
                              }`}>
                              {user.role}
                            </span>
                          </td>
                          <td className="px-4 py-4">
                            {user.status === 'Active' ? (
                              <div className="flex items-center gap-2">
                                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                <span className="text-sm font-medium text-green-700">Active</span>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2">
                                <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                                <div>
                                  <span className="text-sm font-medium text-orange-700">Inactive</span>
                                  <div className="text-xs text-orange-600">for {user.inactiveDays} days</div>
                                </div>
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-4">
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleEditClick(user)}
                                className="p-2 hover:bg-gray-200 rounded-lg transition"
                                title="Edit user"
                              >
                                <Settings className="w-5 h-5 text-gray-600" />
                              </button>
                              <button
                                onClick={() => handleDeleteClick(user)}
                                className="p-2 hover:bg-gray-200 rounded-lg transition"
                                title="Delete user"
                              >
                                <Trash2 className="w-5 h-5 text-red-600" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                          No users found matching your search criteria.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              )}
            </div>

            {/* Pagination */}
            <div className="p-4 border-t bg-gray-50 flex flex-col sm:flex-row items-center justify-between gap-3">
              <span className="text-sm text-gray-600">
                Page {currentPage} of {totalPages} ({filteredUsers.length} total users)
              </span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1 text-sm border rounded-lg disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-100 transition"
                >
                  Previous
                </button>
                {getPageNumbers().map((page, idx) =>
                  typeof page === 'string' ? (
                    <span key={`dots-${idx}`} className="px-2 py-1 text-sm text-gray-400">...</span>
                  ) : (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={`px-3 py-1 text-sm border rounded-lg transition ${
                        currentPage === page
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'hover:bg-gray-100'
                      }`}
                    >
                      {page}
                    </button>
                  )
                )}
                <button
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1 text-sm border rounded-lg disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-100 transition"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Delete User Dialog */}
      {showDeleteDialog && selectedUser && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
        >
          <div
            className="bg-white rounded-lg max-w-md w-full p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex flex-col items-center text-center mb-6">
              <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mb-4">
                <AlertTriangle className="w-8 h-8 text-yellow-600" />
              </div>
              <h2 className="text-xl font-bold mb-2">Delete User Account?</h2>
              <p className="text-gray-600 mb-4">You are about to permanently delete:</p>
              <div className="bg-yellow-50 border-2 border-yellow-300 rounded-lg p-3 w-full">
                <p className="font-semibold text-gray-900">{selectedUser.name}</p>
                <p className="text-sm text-gray-600">{selectedUser.email} | {selectedUser.id}</p>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteDialog(false)}
                className="flex-1 px-4 py-3 border-2 border-gray-300 rounded-lg font-semibold hover:bg-gray-50 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteConfirm}
                disabled={isProcessing}
                className={`flex-1 px-4 py-3 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {isProcessing ? 'Deleting...' : 'Delete User'}
              </button>
            </div>
          </div>
        </div >
      )}

      {/* Edit User Dialog */}
      {
        showEditDialog && selectedUser && (
          <div
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          >
            <div
              className="bg-white rounded-lg max-w-md w-full p-6 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold">Edit User Setting</h2>
                <button
                  onClick={() => setShowEditDialog(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="mb-6">
                <h3 className="font-bold text-lg">{selectedUser.name}</h3>
                <p className="text-sm text-gray-600">{selectedUser.email} | {selectedUser.id}</p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold mb-2">
                    User ID (Auto-generated)
                  </label>
                  <input
                    type="text"
                    value={selectedUser.id}
                    disabled
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-2">
                    Full Nric Name
                  </label>
                  <input
                    type="text"
                    value={editFormData.name}
                    onChange={(e) => setEditFormData(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-2">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={editFormData.email}
                    onChange={(e) => setEditFormData(prev => ({ ...prev, email: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>


              </div>

              <button
                onClick={handleEditSave}
                disabled={isProcessing}
                className={`w-full mt-6 px-4 py-3 bg-green-500 text-white rounded-lg font-semibold hover:bg-green-600 transition ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {isProcessing ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        )
      }
    </>
  );
};

export default AUserMgtPage;