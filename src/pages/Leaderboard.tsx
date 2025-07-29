import React, { useEffect, useState } from 'react';
import { collection, getDocs, query, orderBy, limit, where } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { User, Club } from '../types';
import { Trophy, User as UserIcon, Users as ClubsIcon } from 'lucide-react';
import { Card, CardBody, CardHeader } from '../components/ui/Card';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import toast from 'react-hot-toast';

// Simple Tooltip components
const Tooltip = ({ children }: { children: React.ReactNode }) => (
    <div className="relative group">{children}</div>
);

const TooltipTrigger = ({ children }: { children: React.ReactNode }) => (
    <div className="cursor-pointer">{children}</div>
);

const TooltipContent = ({ children }: { children: React.ReactNode }) => (
    <div className="absolute z-10 left-0 mt-2 w-max bg-white border border-gray-200 shadow-lg p-3 rounded text-sm opacity-0 group-hover:opacity-100 transition-opacity duration-200">
        {children}
    </div>
);

const Leaderboard: React.FC = () => {
    const [topStudents, setTopStudents] = useState<User[]>([]);
    const [topClubs, setTopClubs] = useState<Club[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchLeaderboards = async () => {
            setIsLoading(true);
            try {
                const studentsQuery = query(
                    collection(db, 'users'),
                    where('role', '==', 'student'),
                    orderBy('points', 'desc'),
                    limit(10)
                );
                const studentsSnapshot = await getDocs(studentsQuery);
                const students = studentsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User));
                setTopStudents(students);

                const clubsQuery = query(collection(db, 'clubs'), orderBy('points', 'desc'), limit(10));
                const clubsSnapshot = await getDocs(clubsQuery);
                const clubs = clubsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Club));
                setTopClubs(clubs);
            } catch (error) {
                console.error("Failed to fetch leaderboards:", error);
                toast.error("Could not load leaderboards.");
            } finally {
                setIsLoading(false);
            }
        };

        fetchLeaderboards();
    }, []);

    const getRankStyle = (index: number) => {
        if (index === 0) return "text-yellow-400";
        if (index === 1) return "text-gray-400";
        if (index === 2) return "text-orange-400";
        return "text-gray-500";
    };

    if (isLoading) {
        return (
            <div className="flex justify-center items-center min-h-[60vh]">
                <LoadingSpinner size="lg" text="Loading Leaderboards..." />
            </div>
        );
    }

    return (
        <div className="animate-fade-in space-y-10 p-4 sm:p-8">
            {/* Title */}
            <div className="text-center">
                <h1 className="text-4xl font-bold text-indigo-700 flex items-center justify-center gap-2">
                    <Trophy className="w-8 h-8 text-yellow-500" /> Leaderboards
                </h1>
                <p className="mt-2 text-gray-600">Top performers will receive recognition and awards!</p>
            </div>

            {/* Points System Note */}
            <div className="max-w-xl mx-auto mt-4">
                <div className="bg-blue-50 border border-blue-200 text-blue-800 p-4 rounded-md text-sm">
                    <p className="font-semibold mb-1">Points System:</p>
                    <ul className="list-disc list-inside space-y-1">
                        <li><strong>+1</strong> point for <span className="font-medium">Event Registration</span></li>
                        <li><strong>+3</strong> points for <span className="font-medium">Event Attendance</span></li>
                        <li><strong>+5</strong> points for <span className="font-medium">Creating an Event</span> (Organizers)</li>
                    </ul>
                </div>
            </div>

            {/* Leaderboards */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Top Students */}
                <Card>
                    <CardHeader>
                        <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                            <UserIcon className="text-blue-500" /> Top 10 Students
                        </h2>
                    </CardHeader>
                    <CardBody>
                        <ol className="space-y-4">
                            {topStudents.map((student, index) => (
                                <li
                                    key={student.id}
                                    className="flex items-center bg-gray-50 hover:bg-gray-100 px-4 py-2 rounded-lg transition"
                                >
                                    <span className={`font-bold text-lg w-6 ${getRankStyle(index)}`}>
                                        {index + 1}
                                    </span>
                                    <div className="ml-3 flex flex-col">
                                        <span className="font-medium text-gray-700 truncate">{student.name}</span>
                                        <Tooltip>
                                            <TooltipTrigger>
                                                <span className="text-xs text-blue-500 hover:underline cursor-help">
                                                    View points breakdown
                                                </span>
                                            </TooltipTrigger>
                                            <TooltipContent>
                                                {(student.eventsRegistered || student.eventsAttended || student.eventsCreated) ? (
                                                    <>
                                                        <p>📝 Registered: {student.eventsRegistered?.length || 0} × 1 = {(student.eventsRegistered?.length || 0) * 1} pts</p>
                                                        <p>✅ Attended: {student.eventsAttended?.length || 0} × 3 = {(student.eventsAttended?.length || 0) * 3} pts</p>
                                                        <p>🎯 Created: {student.eventsCreated?.length || 0} × 5 = {(student.eventsCreated?.length || 0) * 5} pts</p>
                                                    </>
                                                ) : (
                                                    <p className="text-gray-600">Breakdown not available — direct points: {student.points || 0} pts</p>
                                                )}
                                            </TooltipContent>
                                        </Tooltip>
                                    </div>
                                    <span className="ml-auto font-semibold text-indigo-600">
                                        {student.points || 0} pts
                                    </span>
                                </li>
                            ))}
                        </ol>
                    </CardBody>
                </Card>

                {/* Top Clubs */}
                <Card>
                    <CardHeader>
                        <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                            <ClubsIcon className="text-green-500" /> Top 10 Clubs
                        </h2>
                    </CardHeader>
                    <CardBody>
                        <ol className="space-y-4">
                            {topClubs.map((club, index) => (
                                <li
                                    key={club.id}
                                    className="flex items-center bg-gray-50 hover:bg-gray-100 px-4 py-2 rounded-lg transition"
                                >
                                    <span className={`font-bold text-lg w-6 ${getRankStyle(index)}`}>
                                        {index + 1}
                                    </span>
                                    <span className="ml-3 font-medium text-gray-700 truncate">{club.name}</span>
                                    <span className="ml-auto font-semibold text-indigo-600">
                                        {club.points || 0} pts
                                    </span>
                                </li>
                            ))}
                        </ol>
                    </CardBody>
                </Card>
            </div>
        </div>
    );
};

export default Leaderboard;
