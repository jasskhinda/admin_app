'use client';

import { useState } from 'react';

export default function DebugInfo({ trips, facility }) {
  const [showDebug, setShowDebug] = useState(false);

  if (!showDebug) {
    return (
      <div className="mb-4">
        <button
          onClick={() => setShowDebug(true)}
          className="px-3 py-1 bg-yellow-500 text-white text-xs rounded"
        >
          Show Debug Info
        </button>
      </div>
    );
  }

  return (
    <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-medium text-yellow-800">Debug Information</h3>
        <button
          onClick={() => setShowDebug(false)}
          className="px-3 py-1 bg-yellow-500 text-white text-xs rounded"
        >
          Hide Debug
        </button>
      </div>
      
      <div className="space-y-4 text-sm">
        <div>
          <h4 className="font-medium text-yellow-800 mb-2">Sample Trip Data (first 3 trips):</h4>
          <div className="bg-white p-3 rounded border max-h-96 overflow-y-auto">
            <pre className="whitespace-pre-wrap text-xs">
              {JSON.stringify(trips.slice(0, 3).map(trip => ({
                id: trip.id,
                status: trip.status,
                facility_id: trip.facility_id,
                user_id: trip.user_id,
                client_id: trip.client_id,
                client_name: trip.client_name,
                client_email: trip.client_email,
                passenger_name: trip.passenger_name,
                passenger_email: trip.passenger_email,
                contact_name: trip.contact_name,
                contact_email: trip.contact_email,
                profiles: trip.profiles,
                facility: trip.facility
              })), null, 2)}
            </pre>
          </div>
        </div>
        
        <div>
          <h4 className="font-medium text-yellow-800 mb-2">Total Trips: {trips.length}</h4>
          <div className="grid grid-cols-2 gap-4 text-xs">
            <div>
              <strong>With facility_id:</strong> {trips.filter(t => t.facility_id).length}
            </div>
            <div>
              <strong>With profiles:</strong> {trips.filter(t => t.profiles).length}
            </div>
            <div>
              <strong>With client_name:</strong> {trips.filter(t => t.client_name).length}
            </div>
            <div>
              <strong>With client_email:</strong> {trips.filter(t => t.client_email).length}
            </div>
            <div>
              <strong>With passenger_name:</strong> {trips.filter(t => t.passenger_name).length}
            </div>
            <div>
              <strong>With passenger_email:</strong> {trips.filter(t => t.passenger_email).length}
            </div>
          </div>
        </div>

        <div>
          <h4 className="font-medium text-yellow-800 mb-2">Facility Trips (showing facility info):</h4>
          <div className="bg-white p-3 rounded border max-h-48 overflow-y-auto">
            <pre className="whitespace-pre-wrap text-xs">
              {JSON.stringify(trips.filter(t => t.facility_id).map(trip => ({
                id: trip.id,
                facility_name: trip.facility?.name,
                client_info: {
                  profiles: trip.profiles,
                  client_name: trip.client_name,
                  passenger_name: trip.passenger_name,
                  client_email: trip.client_email,
                  passenger_email: trip.passenger_email
                }
              })), null, 2)}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}