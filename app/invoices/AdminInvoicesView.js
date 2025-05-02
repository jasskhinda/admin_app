'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function AdminInvoicesView({ user, userProfile, invoices, invoiceStats }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [minAmount, setMinAmount] = useState('');
  const [maxAmount, setMaxAmount] = useState('');
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState('desc');
  const router = useRouter();

  // Filtering logic
  const filteredInvoices = invoices.filter(invoice => {
    // Filter by search term
    const matchesSearch = 
      searchTerm === '' || 
      invoice.invoice_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      invoice.client_id?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      invoice.client_id?.email?.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Filter by status
    const matchesStatus = 
      filterStatus === 'all' || 
      invoice.status === filterStatus;
    
    // Filter by date range
    const createdAt = new Date(invoice.created_at);
    const matchesStartDate = startDate === '' || createdAt >= new Date(startDate);
    const matchesEndDate = endDate === '' || createdAt <= new Date(endDate);
    
    // Filter by amount range
    const amount = invoice.amount || 0;
    const matchesMinAmount = minAmount === '' || amount >= parseFloat(minAmount);
    const matchesMaxAmount = maxAmount === '' || amount <= parseFloat(maxAmount);
    
    return matchesSearch && matchesStatus && matchesStartDate && matchesEndDate && 
           matchesMinAmount && matchesMaxAmount;
  });

  // Sorting logic
  const sortedInvoices = [...filteredInvoices].sort((a, b) => {
    if (sortBy === 'amount') {
      return sortOrder === 'asc' 
        ? (a.amount || 0) - (b.amount || 0)
        : (b.amount || 0) - (a.amount || 0);
    } else if (['created_at', 'due_date', 'paid_at'].includes(sortBy)) {
      const dateA = a[sortBy] ? new Date(a[sortBy]) : new Date(0);
      const dateB = b[sortBy] ? new Date(b[sortBy]) : new Date(0);
      return sortOrder === 'asc' ? dateA - dateB : dateB - dateA;
    } else if (sortBy === 'client_name') {
      return sortOrder === 'asc' 
        ? (a.client_id?.full_name || '').localeCompare(b.client_id?.full_name || '')
        : (b.client_id?.full_name || '').localeCompare(a.client_id?.full_name || '');
    } else {
      return sortOrder === 'asc' 
        ? (a[sortBy] || '').toString().localeCompare((b[sortBy] || '').toString())
        : (b[sortBy] || '').toString().localeCompare((a[sortBy] || '').toString());
    }
  });

  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString();
  };

  // Format currency for display
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount || 0);
  };

  // Function to generate a status badge
  const getStatusBadge = (status) => {
    if (!status) return null;
    
    const statusClasses = {
      paid: 'bg-green-100 text-green-800',
      unpaid: 'bg-yellow-100 text-yellow-800',
      overdue: 'bg-red-100 text-red-800',
      cancelled: 'bg-gray-100 text-gray-800',
    };
    
    return (
      <span className={`px-2 py-1 rounded-full text-xs ${statusClasses[status] || 'bg-gray-100 text-gray-800'}`}>
        {status}
      </span>
    );
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Invoice Management</h1>
        <Link
          href="/invoices/new"
          className="bg-primary text-onPrimary px-4 py-2 rounded hover:bg-opacity-90"
        >
          Create New Invoice
        </Link>
      </div>

      {/* Financial Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-surface p-4 rounded-lg shadow-sm">
          <h2 className="text-lg font-medium mb-3">Total Revenue</h2>
          <div className="text-3xl font-bold mb-2">{formatCurrency(invoiceStats.totalAmount)}</div>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <span className="text-gray-600">Paid: </span>
              <span className="font-medium text-green-600">{formatCurrency(invoiceStats.paidAmount)}</span>
            </div>
            <div>
              <span className="text-gray-600">Unpaid: </span>
              <span className="font-medium text-yellow-600">{formatCurrency(invoiceStats.unpaidAmount)}</span>
            </div>
          </div>
        </div>

        <div className="bg-surface p-4 rounded-lg shadow-sm">
          <h2 className="text-lg font-medium mb-3">Invoice Status</h2>
          <div className="grid grid-cols-3 gap-2">
            <div className="text-center">
              <div className="text-green-600 text-2xl font-bold">{invoiceStats.paid}</div>
              <div className="text-sm text-gray-600">Paid</div>
            </div>
            <div className="text-center">
              <div className="text-yellow-600 text-2xl font-bold">{invoiceStats.unpaid}</div>
              <div className="text-sm text-gray-600">Unpaid</div>
            </div>
            <div className="text-center">
              <div className="text-red-600 text-2xl font-bold">{invoiceStats.overdue}</div>
              <div className="text-sm text-gray-600">Overdue</div>
            </div>
          </div>
        </div>

        <div className="bg-surface p-4 rounded-lg shadow-sm">
          <h2 className="text-lg font-medium mb-3">Quick Actions</h2>
          <div className="flex flex-col space-y-2">
            <button className="px-4 py-2 bg-primary text-onPrimary rounded hover:bg-opacity-90 text-sm">
              Export Financial Report
            </button>
            <button className="px-4 py-2 bg-primary text-onPrimary rounded hover:bg-opacity-90 text-sm">
              Send Payment Reminders
            </button>
          </div>
        </div>
      </div>

      {/* Search and Filter Controls */}
      <div className="bg-surface p-4 rounded-lg shadow-sm mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium mb-1">Search</label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Invoice #, client name..."
              className="w-full p-2 border rounded focus:ring-2 focus:ring-primary"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">Status</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full p-2 border rounded focus:ring-2 focus:ring-primary"
            >
              <option value="all">All Status</option>
              <option value="paid">Paid</option>
              <option value="unpaid">Unpaid</option>
              <option value="overdue">Overdue</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">Amount Range</label>
            <div className="flex space-x-2">
              <input
                type="number"
                value={minAmount}
                onChange={(e) => setMinAmount(e.target.value)}
                placeholder="Min"
                className="w-full p-2 border rounded focus:ring-2 focus:ring-primary"
              />
              <input
                type="number"
                value={maxAmount}
                onChange={(e) => setMaxAmount(e.target.value)}
                placeholder="Max"
                className="w-full p-2 border rounded focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">Date Range</label>
            <div className="flex space-x-2">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full p-2 border rounded focus:ring-2 focus:ring-primary"
              />
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full p-2 border rounded focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Sort By</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="w-full p-2 border rounded focus:ring-2 focus:ring-primary"
            >
              <option value="created_at">Created Date</option>
              <option value="due_date">Due Date</option>
              <option value="paid_at">Payment Date</option>
              <option value="invoice_number">Invoice Number</option>
              <option value="amount">Amount</option>
              <option value="client_name">Client Name</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">Sort Order</label>
            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
              className="w-full p-2 border rounded focus:ring-2 focus:ring-primary"
            >
              <option value="desc">Descending</option>
              <option value="asc">Ascending</option>
            </select>
          </div>
          
          <div className="flex items-end">
            <button
              onClick={() => {
                setSearchTerm('');
                setFilterStatus('all');
                setStartDate('');
                setEndDate('');
                setMinAmount('');
                setMaxAmount('');
                setSortBy('created_at');
                setSortOrder('desc');
              }}
              className="w-full p-2 border rounded hover:bg-gray-100"
            >
              Reset Filters
            </button>
          </div>
        </div>
      </div>

      {/* Invoices Table */}
      <div className="bg-surface rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Invoice #
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Client
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Due Date
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Amount
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {sortedInvoices.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-6 py-4 text-center text-gray-500">
                    No invoices found
                  </td>
                </tr>
              ) : (
                sortedInvoices.map((invoice) => (
                  <tr key={invoice.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {invoice.invoice_number || `INV-${invoice.id.substring(0, 8)}`}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {invoice.client_id?.full_name || 'Unknown Client'}
                      </div>
                      <div className="text-xs text-gray-500">
                        {invoice.client_id?.email}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(invoice.created_at)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(invoice.due_date)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {formatCurrency(invoice.amount)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(invoice.status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <Link
                          href={`/invoices/${invoice.id}`}
                          className="text-primary hover:text-primary-dark"
                        >
                          View
                        </Link>
                        <Link
                          href={`/invoices/${invoice.id}/edit`}
                          className="text-primary hover:text-primary-dark"
                        >
                          Edit
                        </Link>
                        <button
                          className="text-primary hover:text-primary-dark"
                          onClick={() => {
                            // Handle download action
                          }}
                        >
                          Download
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      
      {/* Filtered Results Summary */}
      <div className="mt-6 bg-surface p-4 rounded-lg shadow-sm">
        <div className="text-sm text-gray-600">
          Showing <span className="font-medium">{sortedInvoices.length}</span> of{' '}
          <span className="font-medium">{invoices.length}</span> invoices |
          Filtered Total: <span className="font-medium">
            {formatCurrency(sortedInvoices.reduce((sum, inv) => sum + (inv.amount || 0), 0))}
          </span>
        </div>
      </div>
    </div>
  );
}