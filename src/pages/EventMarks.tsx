import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db } from '../firebaseConfig';
import { collection, query, where, getDocs, updateDoc, doc } from 'firebase/firestore';
import * as XLSX from 'xlsx';
import Button from '../components/ui/Button';
import toast from 'react-hot-toast';

const EventMarks: React.FC = () => {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const [registrations, setRegistrations] = useState<any[]>([]);
  const [marksData, setMarksData] = useState<Record<string, string | number>>({});
  const [eventTitle, setEventTitle] = useState('');
  const [eventStatus, setEventStatus] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const eventSnap = await getDocs(query(collection(db, 'events'), where('id', '==', eventId)));
        if (!eventSnap.empty) {
          const eventData = eventSnap.docs[0].data();
          setEventTitle(eventData.title || '');
          setEventStatus(eventData.approvalStatus || '');
        }

        const regsQuery = query(collection(db, 'eventRegistrations'), where('eventId', '==', eventId));
        const regsSnap = await getDocs(regsQuery);
        const regs = regsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setRegistrations(regs);

        const marksObj: Record<string, string | number> = {};
        regs.forEach(reg => {
          if (reg.status === 'attended') marksObj[reg.id] = reg.marks ?? '';
          else marksObj[reg.id] = 'AB';
        });
        setMarksData(marksObj);
      } catch (error) {
        toast.error("Failed to load data");
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [eventId]);

  const handleMarksChange = (regId: string, value: string) => {
    setMarksData(prev => ({ ...prev, [regId]: value }));
  };

  const handleSaveMarks = async () => {
    await Promise.all(
      registrations.map(reg => {
        const marks = marksData[reg.id];
        return updateDoc(doc(db, 'eventRegistrations', reg.id), { marks });
      })
    );
    toast.success('Marks saved!');
  };

  const handleDownloadExcel = () => {
    const data = registrations.map((reg, idx) => ({
      'S.No': idx + 1,
      'Reg. No': reg.regNo || '',
      'Name': reg.name || '',
      'Status': reg.status === 'attended' ? 'Present' : 'Absent',
      'Marks': marksData[reg.id] ?? '',
    }));
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Attendance & Marks');
    XLSX.writeFile(workbook, `${eventTitle || 'event'}-attendance-marks.xlsx`);
  };

  if (isLoading) {
    return <div className="text-center p-12">Loading...</div>;
  }

  return (
    <div className="max-w-3xl mx-auto mt-8 p-4 bg-white rounded shadow">
      <h2 className="text-2xl font-bold mb-4">Attendance & Marks Entry</h2>

      {eventStatus && eventStatus !== 'approved' ? (
        <p className="text-red-500 font-semibold">
          This event has been <span className="uppercase">{eventStatus}</span>. Marks entry is disabled.
        </p>
      ) : (
        <>
          <table className="min-w-full border mb-4">
            <thead>
              <tr>
                <th className="border px-2 py-1">S.No</th>
                <th className="border px-2 py-1">Reg. No</th>
                <th className="border px-2 py-1">Name</th>
                <th className="border px-2 py-1">Status</th>
                <th className="border px-2 py-1">Marks</th>
              </tr>
            </thead>
            <tbody>
              {registrations.map((reg, idx) => (
                <tr key={reg.id}>
                  <td className="border px-2 py-1">{idx + 1}</td>
                  <td className="border px-2 py-1">{reg.regNo}</td>
                  <td className="border px-2 py-1">{reg.name}</td>
                  <td className="border px-2 py-1">
                    {reg.status === 'attended' ? 'Present' : 'Absent'}
                  </td>
                  <td className="border px-2 py-1">
                    {reg.status === 'attended' ? (
                      <input
                        type="number"
                        min={0}
                        value={marksData[reg.id] === 'AB' ? '' : marksData[reg.id]}
                        onChange={e => handleMarksChange(reg.id, e.target.value)}
                        className="w-20 border rounded px-1"
                      />
                    ) : (
                      <span className="text-red-500 font-semibold">AB</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <Button onClick={handleSaveMarks} className="mr-2">Save Marks</Button>
          <Button onClick={handleDownloadExcel} variant="outline">Download Excel</Button>
        </>
      )}

      <Button onClick={() => navigate(-1)} variant="outline" className="ml-2">Back</Button>
    </div>
  );
};

export default EventMarks;
