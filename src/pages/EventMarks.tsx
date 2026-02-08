import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db } from '../firebaseConfig';
import { collection, query, where, getDocs, doc, setDoc, getDoc, Timestamp } from 'firebase/firestore';
import { useAuthStore } from '../stores/authStore';
import toast from 'react-hot-toast';
import { ArrowLeft, Save, Download, Search } from 'lucide-react';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Badge from '../components/ui/Badge';

const EventMarks = () => {
  const { eventId } = useParams<{ eventId: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [event, setEvent] = useState<any>(null);
  const [registrations, setRegistrations] = useState<any[]>([]);
  const [marks, setMarks] = useState<Record<string, string>>({}); // registrationId -> marks
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [savingRows, setSavingRows] = useState<Set<string>>(new Set());

  const [originalMarks, setOriginalMarks] = useState<Record<string, string>>({});

  useEffect(() => {
    const fetchData = async () => {
      if (!eventId) return;
      setIsLoading(true);
      try {
        // Fetch Event
        const eventDoc = await getDoc(doc(db, 'events', eventId));
        if (eventDoc.exists()) {
          setEvent({ id: eventDoc.id, ...eventDoc.data() });
        }

        // Fetch Registrations
        const regQuery = query(collection(db, 'eventRegistrations'), where('eventId', '==', eventId));
        const regSnapshot = await getDocs(regQuery);
        const regs = regSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setRegistrations(regs);

        // Fetch Existing Marks
        const marksQuery = query(collection(db, 'eventMarks'), where('eventId', '==', eventId));
        const marksSnapshot = await getDocs(marksQuery);
        const marksMap: Record<string, string> = {};
        marksSnapshot.docs.forEach(doc => {
          const data = doc.data();
          marksMap[data.registrationId] = data.marks.toString();
        });
        setMarks(marksMap);
        setOriginalMarks({ ...marksMap }); // Store original copy

      } catch (error) {
        console.error("Error fetching data:", error);
        toast.error("Failed to load event data.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [eventId]);

  const handleMarkChange = (regId: string, value: string) => {
    setMarks(prev => ({ ...prev, [regId]: value }));
  };

  const handleSaveSingleMark = async (regId: string) => {
    if (!eventId || !user) return;

    const markValue = marks[regId];
    if (!markValue) {
      toast.error("Please enter a mark value");
      return;
    }

    const numericMark = parseFloat(markValue);
    if (isNaN(numericMark)) {
      toast.error("Invalid mark value");
      return;
    }

    // Check if value actually changed
    if (markValue === originalMarks[regId] && originalMarks[regId] !== undefined) {
      toast.success("No changes to save");
      return;
    }

    const reg = registrations.find(r => r.id === regId);
    if (!reg) return;

    setSavingRows(prev => new Set(prev).add(regId));

    try {
      const markDocRef = doc(db, 'eventMarks', `${eventId}_${regId}`);
      await setDoc(markDocRef, {
        eventId: eventId,
        registrationId: regId,
        teamName: reg.teamName || '',
        marks: numericMark,
        gradedBy: user.id,
        gradedAt: Timestamp.now(),
        // Store snapshot of team for record
        teamLead: reg.teamLead || { name: reg.name, regNo: reg.regNo },
        teamSize: reg.teamSize || 1
      });

      setOriginalMarks(prev => ({ ...prev, [regId]: markValue }));
      toast.success("Mark saved!");
    } catch (error) {
      console.error("Error saving mark:", error);
      toast.error("Failed to save mark");
    } finally {
      setSavingRows(prev => {
        const next = new Set(prev);
        next.delete(regId);
        return next;
      });
    }
  };

  const escapeCsv = (str: string) => {
    if (!str) return '';
    const stringValue = String(str);
    if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
      return `"${stringValue.replace(/"/g, '""')}"`;
    }
    return stringValue;
  };

  const handleDownloadCSV = () => {
    if (!event) return;

    let csvContent = "";

    if (event.category === 'hackathon') {
      // Hackathon Format (Team based)
      csvContent = "Team Name,Team Size,Lead Name,Lead RegNo,Member Name,Member RegNo,Member Branch,Marks\n";

      registrations.forEach(reg => {
        const mark = marks[reg.id] || '';
        const teamName = escapeCsv(reg.teamName || 'Individual');
        const teamSize = reg.teamSize || 1;
        const leadName = escapeCsv(reg.teamLead?.name || reg.name);
        const leadRegNo = escapeCsv(reg.teamLead?.regNo || reg.regNo);
        const leadBranch = escapeCsv(reg.teamLead?.branch || reg.branch || '');

        // Add Lead first as a member row
        csvContent += `${teamName},${teamSize},${leadName},${leadRegNo},${leadName},${leadRegNo},${leadBranch},${mark}\n`;

        // Add Members
        if (reg.teamMembers && Array.isArray(reg.teamMembers)) {
          reg.teamMembers.forEach((member: any) => {
            const memName = escapeCsv(member.name);
            const memReg = escapeCsv(member.regNo);
            const memBranch = escapeCsv(member.branch || '');
            csvContent += `${teamName},${teamSize},${leadName},${leadRegNo},${memName},${memReg},${memBranch},${mark}\n`;
          });
        }
      });

    } else {
      // Standard/Individual Event Format
      csvContent = "Name,Reg No,Branch,Marks\n";

      registrations.forEach(reg => {
        const mark = marks[reg.id] || '';
        const name = escapeCsv(reg.name || '');
        const regNo = escapeCsv(reg.regNo || '');
        const branch = escapeCsv(reg.branch || '');

        csvContent += `${name},${regNo},${branch},${mark}\n`;
      });
    }

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `marks_${event.title || 'event'}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredRegistrations = registrations.filter(reg => {
    const searchLower = searchTerm.toLowerCase();
    const teamName = reg.teamName?.toLowerCase() || '';
    const leadName = (reg.teamLead?.name || reg.name || '').toLowerCase();
    const leadRegNo = (reg.teamLead?.regNo || reg.regNo || '').toLowerCase();

    return teamName.includes(searchLower) || leadName.includes(searchLower) || leadRegNo.includes(searchLower);
  });

  if (isLoading) return <div className="p-8 text-center">Loading...</div>;

  return (
    <div className="container mx-auto p-6 max-w-6xl animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start mb-8 gap-4">
        <div>
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="mb-2 -ml-2">
            <ArrowLeft size={16} className="mr-1" /> Back
          </Button>
          <h1 className="text-3xl font-bold text-gray-900">Marks Management</h1>
          <p className="text-gray-600 mt-1">{event?.title}</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={handleDownloadCSV} leftIcon={<Download size={18} />}>
            Export CSV
          </Button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-4 border-b border-gray-200 bg-gray-50 flex items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <Input
              placeholder="Search by team, name, or reg number..."
              className="pl-10 bg-white"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 text-gray-600 text-sm border-b border-gray-200">
                <th className="p-4 font-semibold">Team / Participant</th>
                {event?.category === 'hackathon' && <th className="p-4 font-semibold">Lead Info</th>}
                <th className="p-4 font-semibold">Reg No.</th>
                {event?.category === 'hackathon' && <th className="p-4 font-semibold">Members</th>}
                <th className="p-4 font-semibold w-64">Marks</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredRegistrations.map((reg) => (
                <tr key={reg.id} className="hover:bg-gray-50 transition-colors">
                  <td className="p-4">
                    <div className="font-medium text-gray-900">
                      {reg.teamName || reg.name}
                    </div>
                    {reg.teamSize > 1 && (
                      <Badge variant="neutral" className="mt-1 text-xs">
                        Team of {reg.teamSize}
                      </Badge>
                    )}
                  </td>
                  {event?.category === 'hackathon' && (
                    <td className="p-4 text-sm text-gray-600">
                      {reg.teamLead?.name || reg.name}
                    </td>
                  )}
                  <td className="p-4 text-sm text-gray-500 font-mono">
                    {reg.teamLead?.regNo || reg.regNo}
                  </td>
                  {event?.category === 'hackathon' && (
                    <td className="p-4 text-sm text-gray-500">
                      {reg.teamSize > 1 ? `${reg.teamMembers?.length || 0} Members` : '-'}
                    </td>
                  )}
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        placeholder="0.00"
                        value={marks[reg.id] || ''}
                        onChange={(e) => handleMarkChange(reg.id, e.target.value)}
                        className="w-32 text-right font-mono"
                        onWheel={(e) => e.currentTarget.blur()}
                      />
                      <Button
                        size="sm"
                        onClick={() => handleSaveSingleMark(reg.id)}
                        isLoading={savingRows.has(reg.id)}
                        disabled={!marks[reg.id]}
                        variant={marks[reg.id] && marks[reg.id] !== originalMarks[reg.id] ? "primary" : "outline"}
                      >
                        <Save size={14} />
                      </Button>

                    </div>
                  </td>
                </tr>
              ))}
              {filteredRegistrations.length === 0 && (
                <tr>
                  <td colSpan={event?.category === 'hackathon' ? 5 : 3} className="p-8 text-center text-gray-500">
                    No participants found matching your search.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default EventMarks;
