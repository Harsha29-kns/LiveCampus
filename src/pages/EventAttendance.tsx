import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db } from '../firebaseConfig';
import { collection, query, where, getDocs, doc, getDoc, runTransaction } from 'firebase/firestore';
import QrScanner from 'react-qr-scanner';
import Button from '../components/ui/Button';
import toast from 'react-hot-toast';
import Input from '../components/ui/Input';
import { UserCheck, UserX, Users, Search, ArrowLeft, VideoOff, Award, Download, ChevronDown, ChevronUp, ScanLine, X, Clock } from 'lucide-react';
import { isPast, parseISO, format } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';

const ToggleSwitch = ({ checked, onChange }: { checked: boolean; onChange: (checked: boolean) => void }) => (
  <label className="relative inline-flex items-center cursor-pointer">
    <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} className="sr-only peer" />
    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-teal-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-teal-600"></div>
  </label>
);

const EventAttendance: React.FC = () => {
  const { eventId } = useParams<{ eventId: string }>();
  const navigate = useNavigate();
  const [registrations, setRegistrations] = useState<any[]>([]);
  const [event, setEvent] = useState<any>(null);
  const [showScanner, setShowScanner] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | undefined>(undefined);
  const [isGeneratingCerts, setIsGeneratingCerts] = useState(false);
  const [lastScannedId, setLastScannedId] = useState<string | null>(null);
  const [generatedCertificates, setGeneratedCertificates] = useState<any[]>([]);
  const [expandedTeams, setExpandedTeams] = useState<string[]>([]);

  const toggleTeamExpand = (regId: string) => {
    setExpandedTeams(prev =>
      prev.includes(regId) ? prev.filter(id => id !== regId) : [...prev, regId]
    );
  };

  useEffect(() => {
    const fetchData = async () => {
      if (!eventId) return;
      setIsLoading(true);
      try {
        const eventDoc = await getDoc(doc(db, 'events', eventId));
        if (eventDoc.exists()) {
          setEvent({ id: eventDoc.id, ...eventDoc.data() });
        } else {
          toast.error("Event not found.");
          navigate('/attendance');
          return;
        }
        const q = query(collection(db, 'eventRegistrations'), where('eventId', '==', eventId));
        const snap = await getDocs(q);
        const regsData = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        setRegistrations(regsData);

        // Fetch generated certificates if any
        const certsQuery = query(collection(db, 'certificates'), where('eventId', '==', eventId));
        const certsSnapshot = await getDocs(certsQuery);
        const certsData = certsSnapshot.docs.map(doc => doc.data());
        setGeneratedCertificates(certsData);

      } catch (error) {
        toast.error("Failed to fetch event data.");
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [eventId, navigate]);

  useEffect(() => {
    const requestCameraPermission = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        stream.getTracks().forEach(track => track.stop());

        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoInputs = devices.filter(d => d.kind === "videoinput");
        setVideoDevices(videoInputs);
        setSelectedDeviceId(videoInputs[0]?.deviceId);
      } catch (err) {
        toast.error("Camera access denied. Please allow camera permission.");
        setVideoDevices([]);
      }
    };

    if (showScanner) {
      requestCameraPermission();
    }
  }, [showScanner]);

  const handleToggle = async (regId: string, present: boolean) => {
    try {
      await runTransaction(db, async (transaction) => {
        const regRef = doc(db, 'eventRegistrations', regId);
        const regDoc = await transaction.get(regRef);
        if (!regDoc.exists()) throw new Error("Registration not found!");

        const data = regDoc.data();
        const userId = data.userId;
        const userRef = doc(db, 'users', userId);
        const userDoc = await transaction.get(userRef);

        const newStatus = present ? 'attended' : 'registered';
        const checkedInTime = present ? new Date().toISOString() : null;

        const updateData: any = { status: newStatus, checkedInAt: checkedInTime };

        if (data.teamSize > 1) {
          const memberAttendance = data.memberAttendance || {};
          memberAttendance['lead'] = present;
          if (data.teamMembers && Array.isArray(data.teamMembers)) {
            data.teamMembers.forEach((_: any, index: number) => {
              memberAttendance[index.toString()] = present;
            });
          }
          updateData.memberAttendance = memberAttendance;
        }

        transaction.update(regRef, updateData);

        if (userDoc.exists()) {
          const currentPoints = userDoc.data().points || 0;
          if (present && data.status !== 'attended') {
            transaction.update(userRef, { points: currentPoints + 3 });
          } else if (!present && data.status === 'attended') {
            transaction.update(userRef, { points: currentPoints - 3 });
          }
        }
      });

      setRegistrations(regs =>
        regs.map(r => {
          if (r.id === regId) {
            const updated = {
              ...r,
              status: present ? 'attended' : 'registered',
              checkedInAt: present ? new Date().toISOString() : null
            };
            if (r.teamSize > 1) {
              const memberAttendance = r.memberAttendance || {};
              memberAttendance['lead'] = present;
              if (r.teamMembers) {
                r.teamMembers.forEach((_: any, idx: number) => memberAttendance[idx.toString()] = present);
              }
              updated.memberAttendance = memberAttendance;
            }
            return updated;
          }
          return r;
        })
      );
    } catch (error) {
      console.error("Error updating attendance:", error);
      toast.error("Failed to update attendance.");
    }
  };

  const handleMemberToggle = async (regId: string, memberKey: string, present: boolean) => {
    try {
      await runTransaction(db, async (transaction) => {
        const regRef = doc(db, 'eventRegistrations', regId);
        const regDoc = await transaction.get(regRef);
        if (!regDoc.exists()) throw new Error("Registration not found!");

        const data = regDoc.data();
        const memberAttendance = data.memberAttendance || {};
        memberAttendance[memberKey] = present;

        const isAnyPresent = Object.values(memberAttendance).some(v => v === true);
        const newStatus = isAnyPresent ? 'attended' : 'registered';

        transaction.update(regRef, {
          memberAttendance,
          status: newStatus,
          checkedInAt: isAnyPresent ? (data.checkedInAt || new Date().toISOString()) : null
        });
      });

      setRegistrations(regs =>
        regs.map(r => {
          if (r.id === regId) {
            const memberAttendance = { ...(r.memberAttendance || {}) };
            memberAttendance[memberKey] = present;
            const isAnyPresent = Object.values(memberAttendance).some(v => v === true);
            return { ...r, memberAttendance, status: isAnyPresent ? 'attended' : 'registered' };
          }
          return r;
        })
      );
    } catch (error) {
      console.error("Error updating member:", error);
      toast.error("Failed to update member status.");
    }
  };

  const handleScan = async (data: any) => {
    if (data?.text) {
      if (lastScannedId === data.text) return;
      setLastScannedId(data.text);
      setTimeout(() => setLastScannedId(null), 3000);

      try {
        const parsed = JSON.parse(data.text);
        if (parsed.eventId && parsed.eventId !== eventId) {
          console.warn('Event ID Mismatch', { parsedId: parsed.eventId, currentId: eventId });
        }

        let reg;
        if (parsed.registrationId && parsed.eventId === eventId) {
          reg = registrations.find(r => r.id === parsed.registrationId);
        }
        if (!reg && parsed.userId) {
          reg = registrations.find(r => r.userId === parsed.userId);
        }

        if (reg) {
          const displayName = reg.teamLead ? reg.teamLead.name : reg.name;
          if (reg.status !== 'attended') {
            await handleToggle(reg.id, true);
            toast.success(`Verified: ${displayName}`, { icon: '✅' });
          } else {
            toast(`${displayName} is already checked in.`, { icon: 'ℹ️' });
          }
        } else {
          toast.error('Registration not found or invalid QR.');
        }
      } catch {
        toast.error('Invalid QR code format.');
      }
    }
  };

  const handleGenerateCertificates = async () => {
    setIsGeneratingCerts(true);
    toast.loading('Generating certificates...');
    try {
      const attendees = registrations.filter(r => r.status === 'attended');
      if (attendees.length === 0) {
        toast.error("No attendees found.");
        setIsGeneratingCerts(false);
        return;
      }
      const response = await fetch('/api/generate-certificates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventId, attendees }),
      });
      if (!response.ok) throw new Error('Failed to generate.');

      toast.dismiss();
      toast.success('Certificates generated & sent!');

      // Refresh certs
      const certsQuery = query(collection(db, 'certificates'), where('eventId', '==', eventId));
      const certsSnapshot = await getDocs(certsQuery);
      setGeneratedCertificates(certsSnapshot.docs.map(doc => doc.data()));

    } catch (error) {
      toast.dismiss();
      toast.error("Certificate generation failed.");
      console.error(error);
    } finally {
      setIsGeneratingCerts(false);
    }
  };

  const filteredRegistrations = registrations.filter(reg => {
    const searchLower = searchTerm.toLowerCase();
    if (reg.teamLead) {
      return (
        reg.teamLead.name?.toLowerCase().includes(searchLower) ||
        reg.teamLead.regNo?.toLowerCase().includes(searchLower) ||
        (reg.teamName && reg.teamName.toLowerCase().includes(searchLower))
      );
    }
    return (
      reg.name?.toLowerCase().includes(searchLower) ||
      reg.regNo?.toLowerCase().includes(searchLower)
    );
  });

  const presentCount = registrations.filter(r => r.status === 'attended').length;
  const totalCount = registrations.length;
  const absentCount = totalCount - presentCount;
  const eventHasEnded = event ? isPast(parseISO(event.endDate)) : false;

  if (isLoading) return <div className="flex justify-center items-center h-[50vh]"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-teal-500"></div></div>;

  if (event?.status !== 'approved') {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center">
        <div className="bg-red-50 text-red-600 p-4 rounded-full mb-4"><UserX size={32} /></div>
        <h2 className="text-xl font-bold text-slate-800">Attendance Disabled</h2>
        <p className="text-slate-500 mt-2">This event is currently {event.status}. It must be approved before tracking attendance.</p>
        <Button variant="ghost" onClick={() => navigate(-1)} className="mt-4">Go Back</Button>
      </div>
    );
  }

  return (
    <div className="animate-fade-in space-y-8 pb-10">
      {/* Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-6">
        <div>
          <button onClick={() => navigate(-1)} className="flex items-center text-slate-400 hover:text-slate-600 transition-colors mb-2 text-sm font-medium">
            <ArrowLeft size={16} className="mr-1" /> Back to Dashboard
          </button>
          <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight">{event?.title}</h1>
          <p className="text-slate-500 mt-1 flex items-center gap-2">
            <Clock size={16} /> {event && format(parseISO(event.startDate), 'MMMM do, h:mm a')}
          </p>
        </div>
        <div className="flex gap-3">
          <Button onClick={() => setShowScanner(true)} className="bg-gradient-to-r from-teal-500 to-emerald-500 border-0 hover:shadow-lg hover:shadow-teal-500/30 transition-all text-white">
            <ScanLine size={18} className="mr-2" /> Scan QR
          </Button>
          {event?.certificateTemplateUrl && (
            <Button
              onClick={handleGenerateCertificates}
              isLoading={isGeneratingCerts}
              disabled={!eventHasEnded || isGeneratingCerts}
              variant="outline"
              className="border-slate-200 hover:bg-slate-50 text-slate-700"
            >
              <Award size={18} className="mr-2 text-yellow-500" /> Generate Certificates
            </Button>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.1 }} className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 flex items-center gap-4 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-5"><Users size={64} /></div>
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl"><Users size={24} /></div>
          <div><p className="text-sm font-medium text-slate-500">Total Registered</p><p className="text-3xl font-bold text-slate-800">{totalCount}</p></div>
        </motion.div>
        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 }} className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 flex items-center gap-4 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-5"><UserCheck size={64} /></div>
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl"><UserCheck size={24} /></div>
          <div><p className="text-sm font-medium text-slate-500">Present</p><p className="text-3xl font-bold text-emerald-600">{presentCount}</p></div>
        </motion.div>
        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.3 }} className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 flex items-center gap-4 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-5"><UserX size={64} /></div>
          <div className="p-3 bg-rose-50 text-rose-600 rounded-xl"><UserX size={24} /></div>
          <div><p className="text-sm font-medium text-slate-500">Absent</p><p className="text-3xl font-bold text-rose-600">{absentCount}</p></div>
        </motion.div>
      </div>

      {/* Main List */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center gap-3 sticky top-0 z-10 backdrop-blur-md">
          <Input
            placeholder="Search by name, Reg No, or team..."
            leftIcon={<Search size={18} />}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="bg-white shadow-sm border-slate-200 focus:border-teal-500 focus:ring-teal-500"
          />
        </div>

        <div className="divide-y divide-slate-100 max-h-[600px] overflow-y-auto custom-scrollbar">
          {filteredRegistrations.length > 0 ? (
            <AnimatePresence>
              {filteredRegistrations.map((reg) => {
                const isTeam = reg.teamSize && reg.teamSize > 1;
                const isExpanded = expandedTeams.includes(reg.id);
                const displayName = reg.teamLead ? reg.teamLead.name : reg.name;
                const displayRegNo = reg.teamLead ? reg.teamLead.regNo : reg.regNo;
                const displayInfo = isTeam ? `Team of ${reg.teamSize}` : (reg.branch || 'Individual');

                return (
                  <motion.div
                    layout
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    key={reg.id}
                    className={`transition-colors ${isExpanded ? 'bg-slate-50' : 'bg-white hover:bg-slate-50/50'}`}
                  >
                    <div className="p-4 flex items-center justify-between">
                      <div className="flex items-center gap-4 flex-1">
                        {isTeam && (
                          <button onClick={() => toggleTeamExpand(reg.id)} className="text-slate-400 hover:text-teal-600 transition-colors p-1">
                            {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                          </button>
                        )}
                        <div className="flex flex-col">
                          <span className="font-bold text-slate-800 text-lg flex items-center gap-2">
                            {isTeam ? (reg.teamName || 'Team') : displayName}
                            {isTeam && <span className="text-xs font-normal px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded-full border border-indigo-100">{reg.teamSize} Members</span>}
                          </span>
                          <span className="text-sm text-slate-500 flex items-center gap-2">
                            {isTeam ? `Lead: ${displayName} (${displayRegNo})` : `${displayRegNo} • ${displayInfo}`}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        <span className={`text-sm font-semibold px-3 py-1 rounded-full ${reg.status === 'attended' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                          {reg.status === 'attended' ? 'Present' : 'Absent'}
                        </span>
                        <ToggleSwitch checked={reg.status === 'attended'} onChange={(c) => handleToggle(reg.id, c)} />
                      </div>
                    </div>

                    {/* Team Members Expansion */}
                    {isTeam && isExpanded && (
                      <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="px-4 pb-4 pl-12 space-y-2">
                        <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-sm flex justify-between items-center">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold border border-indigo-200">L</div>
                            <div><p className="font-semibold text-slate-800">{displayName}</p><p className="text-xs text-slate-400">{displayRegNo} (Lead)</p></div>
                          </div>
                          <ToggleSwitch checked={reg.memberAttendance?.['lead'] ?? (reg.status === 'attended')} onChange={(v) => handleMemberToggle(reg.id, 'lead', v)} />
                        </div>
                        {reg.teamMembers?.map((member: any, idx: number) => (
                          <div key={idx} className="p-3 bg-white rounded-xl border border-slate-200 shadow-sm flex justify-between items-center">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-bold border border-slate-200">{idx + 1}</div>
                              <div><p className="font-semibold text-slate-800">{member.name}</p><p className="text-xs text-slate-400">{member.regNo}</p></div>
                            </div>
                            <ToggleSwitch checked={reg.memberAttendance?.[idx.toString()] ?? (reg.status === 'attended')} onChange={(v) => handleMemberToggle(reg.id, idx.toString(), v)} />
                          </div>
                        ))}
                      </motion.div>
                    )}
                  </motion.div>
                );
              })}
            </AnimatePresence>
          ) : (
            <div className="text-center py-12">
              <Search className="h-12 w-12 text-slate-200 mx-auto mb-3" />
              <p className="text-slate-500">No participants found.</p>
            </div>
          )}
        </div>
      </div>

      {generatedCertificates.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 mt-8">
          <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2"><Award className="text-yellow-500" /> Issued Certificates</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {generatedCertificates.map(cert => (
              <div key={cert.id} className="p-4 border border-slate-100 rounded-xl bg-slate-50 flex justify-between items-center hover:shadow-md transition-shadow">
                <div>
                  <p className="font-bold text-slate-800">{cert.userName}</p>
                  <p className="text-xs text-slate-500">{new Date(cert.issuedAt).toLocaleDateString()}</p>
                </div>
                <Button size="sm" variant="outline" leftIcon={<Download size={14} />} onClick={() => window.open(cert.certificateUrl, '_blank')}>
                  Save
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Premium Scanner Modal */}
      <AnimatePresence>
        {showScanner && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          >
            <div className="bg-white rounded-3xl overflow-hidden max-w-md w-full shadow-2xl relative">
              <button onClick={() => setShowScanner(false)} className="absolute top-4 right-4 p-2 bg-black/20 hover:bg-black/40 text-white rounded-full transition-colors z-10"><X size={20} /></button>

              <div className="p-6 text-center bg-slate-900 text-white">
                <h2 className="text-xl font-bold mb-2">Scan Ticket</h2>
                <p className="text-slate-400 text-sm">Align QR code within the frame</p>
              </div>

              <div className="relative bg-black aspect-square">
                {selectedDeviceId ? (
                  <QrScanner
                    delay={300}
                    onError={() => toast.error('Check camera permissions')}
                    onScan={handleScan}
                    constraints={{ video: { deviceId: { exact: selectedDeviceId } } }}
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-slate-500">
                    <VideoOff size={40} className="mb-2" />
                    <p>Camera unavailable</p>
                  </div>
                )}
                {/* Scanner overlay */}
                <div className="absolute inset-0 border-[40px] border-slate-900/50 pointer-events-none">
                  <div className="absolute inset-4 border-2 border-teal-500 opacity-50 rounded-lg"></div>
                  <div className="absolute left-0 right-0 h-0.5 bg-teal-500 shadow-[0_0_15px_rgba(20,184,166,0.8)] animate-scan"></div>
                </div>
              </div>

              <div className="p-4 bg-white">
                {videoDevices.length > 1 && (
                  <select onChange={e => setSelectedDeviceId(e.target.value)} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 text-sm">
                    {videoDevices.map(d => <option key={d.deviceId} value={d.deviceId}>{d.label}</option>)}
                  </select>
                )}
                <Button variant="outline" onClick={() => setShowScanner(false)} className="w-full mt-3">Cancel</Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default EventAttendance;