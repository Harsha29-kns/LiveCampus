import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db } from '../firebaseConfig';
import { collection, query, where, getDocs, doc, setDoc, getDoc, Timestamp } from 'firebase/firestore';
import { useAuthStore } from '../stores/authStore';
import toast from 'react-hot-toast';
import { ArrowLeft, Save, Search, CheckCircle, FileSpreadsheet } from 'lucide-react';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import { motion, AnimatePresence } from 'framer-motion';

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
        const eventDoc = await getDoc(doc(db, 'events', eventId));
        if (eventDoc.exists()) {
          setEvent({ id: eventDoc.id, ...eventDoc.data() });
        }
        const regQuery = query(collection(db, 'eventRegistrations'), where('eventId', '==', eventId));
        const regSnapshot = await getDocs(regQuery);
        const regs = regSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setRegistrations(regs);

        const marksQuery = query(collection(db, 'eventMarks'), where('eventId', '==', eventId));
        const marksSnapshot = await getDocs(marksQuery);
        const marksMap: Record<string, string> = {};
        marksSnapshot.docs.forEach(doc => {
          const data = doc.data();
          marksMap[data.registrationId] = data.marks.toString();
        });
        setMarks(marksMap);
        setOriginalMarks({ ...marksMap });
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
        eventId,
        registrationId: regId,
        teamName: reg.teamName || '',
        marks: numericMark,
        gradedBy: user.id,
        gradedAt: Timestamp.now(),
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
      csvContent = "Team Name,Team Size,Lead Name,Lead RegNo,Member Name,Member RegNo,Member Branch,Marks\n";
      registrations.forEach(reg => {
        const mark = marks[reg.id] || '';
        const teamName = escapeCsv(reg.teamName || 'Individual');
        const teamSize = reg.teamSize || 1;
        const leadName = escapeCsv(reg.teamLead?.name || reg.name);
        const leadRegNo = escapeCsv(reg.teamLead?.regNo || reg.regNo);
        const leadBranch = escapeCsv(reg.teamLead?.branch || reg.branch || '');

        csvContent += `${teamName},${teamSize},${leadName},${leadRegNo},${leadName},${leadRegNo},${leadBranch},${mark}\n`;
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

  if (isLoading) return <div className="flex justify-center items-center h-[60vh]"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div></div>;

  return (
    <div className="container mx-auto p-4 max-w-7xl animate-fade-in pb-20">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 gap-4">
        <div>
          <button onClick={() => navigate(-1)} className="flex items-center text-slate-400 hover:text-slate-600 transition-colors mb-2 text-sm font-medium">
            <ArrowLeft size={16} className="mr-1" /> Back to Dashboard
          </button>
          <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight">Gradebook</h1>
          <p className="text-slate-500 mt-1">{event?.title}</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={handleDownloadCSV} className="border-slate-200 text-slate-700 hover:bg-slate-50">
            <FileSpreadsheet size={18} className="mr-2 text-green-600" /> Export CSV
          </Button>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex items-center gap-4 backdrop-blur-sm sticky top-0 z-10">
          <div className="relative flex-1 max-w-md">
            <Input
              placeholder="Search by team, name, or reg number..."
              leftIcon={<Search size={18} />}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-white shadow-sm border-slate-200 focus:border-indigo-500 focus:ring-indigo-500"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-xs font-bold uppercase tracking-wider border-b border-slate-200">
                <th className="p-4">Participant / Team</th>
                {event?.category === 'hackathon' && <th className="p-4 hidden md:table-cell">Details</th>}
                <th className="p-4">Marks</th>
                <th className="p-4 w-32 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              <AnimatePresence>
                {filteredRegistrations.map((reg) => {
                  const isSaved = marks[reg.id] && marks[reg.id] === originalMarks[reg.id];
                  const isChanged = marks[reg.id] !== originalMarks[reg.id];

                  return (
                    <motion.tr
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      key={reg.id}
                      className={`hover:bg-slate-50/80 transition-colors ${isChanged ? 'bg-indigo-50/30' : ''}`}
                    >
                      <td className="p-4">
                        <div className="font-bold text-slate-800 text-lg">
                          {reg.teamName || reg.name}
                        </div>
                        <div className="text-sm text-slate-500 mt-0.5">
                          {reg.teamLead?.regNo || reg.regNo}
                          {reg.teamSize > 1 && <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-800">Team of {reg.teamSize}</span>}
                        </div>
                      </td>
                      {event?.category === 'hackathon' && (
                        <td className="p-4 hidden md:table-cell">
                          <div className="text-sm text-slate-600">
                            <p><span className="font-medium">Lead:</span> {reg.teamLead?.name || reg.name}</p>
                            <p className="text-xs text-slate-400 mt-1">{reg.teamSize > 1 ? `${reg.teamMembers?.length || 0} Members` : 'Individual'}</p>
                          </div>
                        </td>
                      )}
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <Input
                            type="number"
                            placeholder="0.00"
                            value={marks[reg.id] || ''}
                            onChange={(e) => handleMarkChange(reg.id, e.target.value)}
                            className={`w-32 text-right font-mono font-bold text-lg ${isChanged ? 'border-indigo-400 ring-2 ring-indigo-100' : 'border-slate-200'}`}
                            onWheel={(e) => e.currentTarget.blur()}
                          />
                        </div>
                      </td>
                      <td className="p-4 text-center">
                        <Button
                          size="sm"
                          onClick={() => handleSaveSingleMark(reg.id)}
                          isLoading={savingRows.has(reg.id)}
                          disabled={!marks[reg.id] || !isChanged}
                          variant={isChanged ? "primary" : "ghost"}
                          className={`w-full transition-all ${isChanged ? 'shadow-md shadow-indigo-200' : 'text-slate-400'}`}
                        >
                          {savingRows.has(reg.id) ? '' : isChanged ? <Save size={16} className="mr-1" /> : isSaved ? <CheckCircle size={18} className="text-emerald-500" /> : <Save size={16} />}
                          {isChanged ? 'Save' : isSaved ? 'Saved' : 'Save'}
                        </Button>
                      </td>
                    </motion.tr>
                  )
                })}
              </AnimatePresence>
              {filteredRegistrations.length === 0 && (
                <tr>
                  <td colSpan={event?.category === 'hackathon' ? 4 : 3} className="p-12 text-center text-slate-400">
                    <Search className="h-10 w-10 mx-auto mb-2 opacity-50" />
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
