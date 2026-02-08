import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db } from '../firebaseConfig';
import { collection, query, where, getDocs, doc, getDoc, runTransaction } from 'firebase/firestore';
import QrScanner from 'react-qr-scanner';
import Button from '../components/ui/Button';
import toast from 'react-hot-toast';
import Input from '../components/ui/Input';
import Badge from '../components/ui/Badge';
import { UserCheck, UserX, Users, QrCode, Search, ArrowLeft, VideoOff, Award, Download, ChevronDown, ChevronUp } from 'lucide-react';
import { isPast, parseISO } from 'date-fns';

const ToggleSwitch = ({ checked, onChange }: { checked: boolean; onChange: (checked: boolean) => void }) => (
  <label className="relative inline-flex items-center cursor-pointer">
    <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} className="sr-only peer" />
    <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-focus:ring-4 peer-focus:ring-indigo-300 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
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
  // --- NEW STATE TO PREVENT RAPID RE-SCANS ---
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
        toast.error("Camera access denied. Please allow camera permission in your browser or device settings.");
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
        if (!regDoc.exists()) {
          throw new Error("Registration not found!");
        }

        const data = regDoc.data();
        const userId = data.userId;
        const userRef = doc(db, 'users', userId);

        // Perform all reads first
        const userDoc = await transaction.get(userRef);

        const newStatus = present ? 'attended' : 'registered';
        const checkedInTime = present ? new Date().toISOString() : null;

        // Prepare update data
        const updateData: any = {
          status: newStatus,
          checkedInAt: checkedInTime
        };

        // If it's a team, update memberAttendance for all
        if (data.teamSize > 1) {
          const memberAttendance = data.memberAttendance || {};

          // Set lead status
          memberAttendance['lead'] = present;

          // Set members status
          if (data.teamMembers && Array.isArray(data.teamMembers)) {
            data.teamMembers.forEach((_: any, index: number) => {
              memberAttendance[index.toString()] = present;
            });
          }

          updateData.memberAttendance = memberAttendance;
        }

        // Perform all writes after reads
        transaction.update(regRef, updateData);

        // Gamification: Award points for attendance (Team Lead only for now)
        if (userDoc.exists()) {
          const currentPoints = userDoc.data().points || 0;
          if (present && data.status !== 'attended') {
            transaction.update(userRef, { points: currentPoints + 3 });
          } else if (!present && data.status === 'attended') {
            transaction.update(userRef, { points: currentPoints - 3 });
          }
        }
      });

      // Optimistic update
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
                r.teamMembers.forEach((_: any, idx: number) => {
                  memberAttendance[idx.toString()] = present;
                });
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

        // Update specific member
        memberAttendance[memberKey] = present;

        // Recalculate overall status
        // If ANY member is present, the team is "attended" (partially or fully)
        const isAnyPresent = Object.values(memberAttendance).some(v => v === true);
        const newStatus = isAnyPresent ? 'attended' : 'registered';

        transaction.update(regRef, {
          memberAttendance,
          status: newStatus,
          checkedInAt: isAnyPresent ? (data.checkedInAt || new Date().toISOString()) : null
        });
      });

      // Optimistic update
      setRegistrations(regs =>
        regs.map(r => {
          if (r.id === regId) {
            const memberAttendance = { ...(r.memberAttendance || {}) };
            memberAttendance[memberKey] = present;
            const isAnyPresent = Object.values(memberAttendance).some(v => v === true);

            return {
              ...r,
              memberAttendance,
              status: isAnyPresent ? 'attended' : 'registered'
            };
          }
          return r;
        })
      );
    } catch (error) {
      console.error("Error updating member attendance:", error);
      toast.error("Failed to update member status.");
    }
  };


  const handleScan = async (data: any) => {
    // --- MODIFIED SCAN LOGIC ---
    if (data?.text) {
      // If the same QR is scanned again within 3 seconds, ignore it.
      if (lastScannedId === data.text) {
        return;
      }
      setLastScannedId(data.text);

      // Reset the last scanned ID after 3 seconds to allow for new scans.
      setTimeout(() => setLastScannedId(null), 3000);

      try {
        const parsed = JSON.parse(data.text);
        // Relaxed Check: If eventId exists but doesn't match, we still check if the USER is registered for THIS event.
        // This effectively treats the QR code as a "User ID" card if the specific ticket doesn't match.
        if (parsed.eventId && parsed.eventId !== eventId) {
          console.warn('QR Event ID Mismatch (Identity Verification Mode):', { parsedId: parsed.eventId, currentId: eventId });
          // We do NOT return here. We proceed to check if this userId is in the current event's registration list.
        }

        let reg;
        // Prioritize registrationId for team events IF it matches (though unlikely if eventId mismatched)
        // If eventId mismatched, we rely on userId.
        if (parsed.registrationId && parsed.eventId === eventId) {
          reg = registrations.find(r => r.id === parsed.registrationId);
        }

        // Fallback or Identity Mode: Find by userId
        if (!reg && parsed.userId) {
          reg = registrations.find(r => r.userId === parsed.userId);
        }

        if (reg) {
          // Get the display name (handle both individual and team registrations)
          const displayName = reg.teamLead ? reg.teamLead.name : reg.name;
          const displayId = reg.teamLead ? reg.teamLead.regNo : reg.regNo;

          if (parsed.eventId !== eventId) {
            toast(`Event ID mismatch ignored. Verified ${displayName || displayId} via User ID.`, { icon: '⚠️' });
          }

          if (reg.status !== 'attended') {
            await handleToggle(reg.id, true);
            toast.success(`Welcome, ${displayName || displayId}! Marked as present.`);
          } else {
            toast.success(`${displayName || displayId} is already marked as present.`);
          }
        } else {
          // If we couldn't find the reg, AND the eventId was wrong, then it's definitely a bad scan.
          if (parsed.eventId && parsed.eventId !== eventId) {
            toast.error(`QR code is for a different event (${parsed.eventId}) and user is not registered here.`);
          } else {
            toast.error('Registration not found for this user.');
          }
        }
      } catch {
        toast.error('Invalid QR code format.');
      }
    }
  };

  const handleGenerateCertificates = async () => {
    setIsGeneratingCerts(true);
    toast.loading('Generating and sending certificates... This may take a moment.');

    try {
      const attendees = registrations.filter(r => r.status === 'attended');
      if (attendees.length === 0) {
        toast.error("No attendees to generate certificates for.");
        setIsGeneratingCerts(false); // Stop loading if no attendees
        return;
      }

      const response = await fetch('/api/generate-certificates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventId,
          attendees,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate certificates.');
      }

      toast.dismiss();
      toast.success('Certificates have been successfully generated and sent to attendees!');

      // Fetch the generated certificates to allow for download
      const certsQuery = query(collection(db, 'certificates'), where('eventId', '==', eventId));
      const certsSnapshot = await getDocs(certsQuery);
      const certsData = certsSnapshot.docs.map(doc => doc.data());
      setGeneratedCertificates(certsData);

    } catch (error) {
      toast.dismiss();
      toast.error("An error occurred while generating certificates.");
      console.error(error);
    } finally {
      setIsGeneratingCerts(false);
    }
  };

  const filteredRegistrations = registrations.filter(reg => {
    const searchLower = searchTerm.toLowerCase();

    // For team registrations
    if (reg.teamLead) {
      return (
        reg.teamLead.name?.toLowerCase().includes(searchLower) ||
        reg.teamLead.regNo?.toLowerCase().includes(searchLower)
      );
    }

    // For individual registrations
    return (
      reg.name?.toLowerCase().includes(searchLower) ||
      reg.regNo?.toLowerCase().includes(searchLower)
    );
  });

  const presentCount = registrations.filter(r => r.status === 'attended').length;
  const totalCount = registrations.length;
  const absentCount = totalCount - presentCount;
  const eventHasEnded = event ? isPast(parseISO(event.endDate)) : false;


  if (isLoading) {
    return <div className="text-center p-12">Loading Attendance Data...</div>;
  }

  if (event?.status !== 'approved') {
    return (
      <div className="text-center p-12 text-red-600 font-semibold">
        This event is currently <span className="uppercase">{event.status}</span>. Attendance tracking is disabled until the event is approved.
      </div>
    );
  }

  return (
    <div className="animate-fade-in space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
        <div>
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="mb-2 -ml-2">
            <ArrowLeft size={16} className="mr-1" /> Back to Dashboard
          </Button>
          <h1 className="text-3xl font-bold text-gray-900">{event?.title || 'Event Attendance'}</h1>
          <p className="mt-1 text-gray-600">
            Manage attendee check-ins manually or with the QR scanner.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <Button onClick={() => setShowScanner(true)} leftIcon={<QrCode size={18} />}>
            Scan QR Code
          </Button>
          {event?.certificateTemplateUrl && (
            <Button
              onClick={handleGenerateCertificates}
              leftIcon={<Award size={18} />}
              isLoading={isGeneratingCerts}
              disabled={!eventHasEnded || isGeneratingCerts}
              title={!eventHasEnded ? "You can generate certificates after the event has ended." : "Generate and email certificates to all attendees."}
            >
              Generate Certificates
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-lg border shadow-sm flex items-center gap-4">
          <div className="p-3 bg-blue-100 rounded-full"><Users className="h-6 w-6 text-blue-600" /></div>
          <div>
            <p className="text-sm text-gray-500">Total Registered</p>
            <p className="text-2xl font-bold text-gray-900">{totalCount}</p>
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg border shadow-sm flex items-center gap-4">
          <div className="p-3 bg-green-100 rounded-full"><UserCheck className="h-6 w-6 text-green-600" /></div>
          <div>
            <p className="text-sm text-gray-500">Present</p>
            <p className="text-2xl font-bold text-green-600">{presentCount}</p>
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg border shadow-sm flex items-center gap-4">
          <div className="p-3 bg-red-100 rounded-full"><UserX className="h-6 w-6 text-red-600" /></div>
          <div>
            <p className="text-sm text-gray-500">Absent</p>
            <p className="text-2xl font-bold text-red-600">{absentCount}</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg border shadow-sm">
        <div className="p-4 border-b">
          <Input
            placeholder="Search by name or reg no..."
            leftIcon={<Search size={18} />}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="divide-y divide-gray-200">
          {filteredRegistrations.length > 0 ? filteredRegistrations.map(reg => {
            // Check if it's a team registration
            const isTeam = reg.teamSize && reg.teamSize > 1;
            const isExpanded = expandedTeams.includes(reg.id);
            const allPresent = reg.status === 'attended'; // Simplified for "Mark All" button state

            if (isTeam) {
              return (
                <div key={reg.id} className="mb-4 border-2 border-indigo-100 rounded-xl overflow-hidden shadow-sm transition-all duration-300 hover:shadow-md">
                  {/* Team Header Row */}
                  <div
                    className="bg-white p-4 cursor-pointer hover:bg-indigo-50 transition-colors"
                    onClick={() => toggleTeamExpand(reg.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="text-indigo-500">
                          {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                        </div>
                        <div>
                          <h3 className="font-bold text-gray-900 flex items-center gap-2">
                            {reg.teamName || 'Team'}
                            <span className="text-xs font-normal px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded-full">
                              {reg.teamSize} Members
                            </span>
                          </h3>
                          <p className="text-sm text-gray-500">Lead: {reg.teamLead?.name || reg.name}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        <Badge variant={reg.status === 'attended' ? 'success' : 'neutral'}>
                          {reg.status === 'attended' ? 'Present' : 'Absent'}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  {/* Expanded Members List */}
                  {isExpanded && (
                    <div className="bg-gray-50 border-t border-indigo-100 p-4 space-y-3 animate-fade-in">
                      {/* Team Lead Row */}
                      <div className="flex justify-between items-center bg-white p-3 rounded-lg border border-gray-100 shadow-sm">
                        <div className="flex items-center gap-2">
                          <span className="text-xl">👑</span>
                          <div>
                            <p className="font-semibold text-gray-800">{reg.teamLead?.name || reg.name}</p>
                            <p className="text-xs text-gray-500">Team Lead • {reg.teamLead?.regNo || reg.regNo}</p>
                          </div>
                        </div>
                        <ToggleSwitch
                          checked={reg.memberAttendance?.['lead'] ?? (reg.status === 'attended')}
                          onChange={(val) => handleMemberToggle(reg.id, 'lead', val)}
                        />
                      </div>

                      {/* Team Members Rows */}
                      {reg.teamMembers?.map((member: any, idx: number) => (
                        <div key={idx} className="flex justify-between items-center bg-white p-3 rounded-lg border border-gray-100 shadow-sm">
                          <div>
                            <p className="font-medium text-gray-800">{member.name}</p>
                            <p className="text-xs text-gray-500">{member.regNo} • {member.branch}</p>
                          </div>
                          <ToggleSwitch
                            checked={reg.memberAttendance?.[idx.toString()] ?? (reg.status === 'attended')}
                            onChange={(val) => handleMemberToggle(reg.id, idx.toString(), val)}
                          />
                        </div>
                      ))}

                      {/* Team Actions */}
                      <div className="pt-2 flex justify-end">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggle(reg.id, !allPresent);
                          }}
                        >
                          {allPresent ? 'Mark All Absent' : 'Mark All Present'}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              );
            }

            // Determine display info based on registration type
            const displayName = reg.teamLead ? reg.teamLead.name : reg.name;
            const displayRegNo = reg.teamLead ? reg.teamLead.regNo : reg.regNo;
            const displayBranch = reg.teamLead ? reg.teamLead.branch : reg.branch;
            const displayInfo = reg.teamSize > 1 ? `Team of ${reg.teamSize}` : displayBranch;

            return (
              <div key={reg.id} className="flex items-center justify-between p-4 hover:bg-gray-50">
                <div>
                  <p className="font-semibold text-gray-800">{displayName}</p>
                  <p className="text-sm text-gray-500">{displayRegNo} - {displayInfo}</p>
                </div>
                <div className="flex items-center gap-4">
                  <Badge variant={reg.status === 'attended' ? 'success' : 'neutral'}>
                    {reg.status === 'attended' ? 'Present' : 'Absent'}
                  </Badge>
                  <ToggleSwitch
                    checked={reg.status === 'attended'}
                    onChange={(checked) => handleToggle(reg.id, checked)}
                  />
                </div>
              </div>
            );
          }) : (
            <p className="text-center text-gray-500 p-8">No matching registrations found.</p>
          )}
        </div>
      </div>

      {generatedCertificates.length > 0 && (
        <div className="bg-white rounded-lg border shadow-sm mt-8">
          <div className="p-4 border-b">
            <h3 className="text-lg font-semibold">Generated Certificates</h3>
          </div>
          <div className="divide-y divide-gray-200">
            {generatedCertificates.map(cert => (
              <div key={cert.id} className="flex items-center justify-between p-4">
                <div>
                  <p className="font-semibold text-gray-800">{cert.userName}</p>
                  <p className="text-sm text-gray-500">Issued on: {new Date(cert.issuedAt).toLocaleDateString()}</p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  leftIcon={<Download size={16} />}
                  onClick={() => window.open(cert.certificateUrl, '_blank')}
                >
                  Download
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {showScanner && (
        <div className="fixed inset-0 bg-black bg-opacity-80 flex flex-col items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white rounded-xl p-6 w-full max-w-md text-center">
            <h2 className="text-2xl font-bold mb-4">Scan Attendance QR</h2>

            {videoDevices.length > 1 && (
              <select onChange={e => setSelectedDeviceId(e.target.value)} className="w-full mb-4 p-2 border rounded-md bg-gray-50">
                {videoDevices.map(device => (
                  <option key={device.deviceId} value={device.deviceId}>{device.label}</option>
                ))}
              </select>
            )}

            <div className="rounded-lg overflow-hidden border-2 border-indigo-500">
              {selectedDeviceId ? (
                <QrScanner
                  delay={300}
                  onError={() => toast.error('QR scan error. Please check camera permissions.')}
                  onScan={handleScan}
                  constraints={{ video: { deviceId: { exact: selectedDeviceId } } }}
                  style={{ width: "100%" }}
                />
              ) : (
                <div className="bg-gray-100 h-64 flex flex-col items-center justify-center text-gray-600">
                  <VideoOff size={48} className="mb-4" />
                  <p>No camera detected or permission denied.</p>
                  <p className="text-sm">Please ensure camera access is granted in browser or mobile settings.</p>
                </div>
              )}
            </div>

            <Button variant="outline" onClick={() => setShowScanner(false)} className="mt-4 w-full">
              Close Scanner
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default EventAttendance;