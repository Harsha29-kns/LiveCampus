import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Search, Plus, Tag, Pencil, Trash2 } from 'lucide-react';
import { useClubStore } from '../stores/clubStore';
import { useAuthStore } from '../stores/authStore';
import { Card, CardBody } from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Badge from '../components/ui/Badge';
import { Club } from '../types';
import { doc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import toast from 'react-hot-toast';

const Clubs: React.FC = () => {
  const { clubs, fetchClubs, isLoading } = useClubStore();
  const { user } = useAuthStore();
  const navigate = useNavigate();

  const [searchTerm, setSearchTerm] = useState('');
  const [filteredClubs, setFilteredClubs] = useState<Club[]>([]);

  useEffect(() => {
    fetchClubs();
  }, [fetchClubs]);

  useEffect(() => {
    if (clubs.length > 0) {
      let filtered = [...clubs];

      // Apply search filter
      if (searchTerm) {
        filtered = filtered.filter(club =>
          club.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          club.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (club.tags && club.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase())))
        );
      }

      // Sort by member count (most popular first)
      filtered.sort((a, b) => b.memberCount - a.memberCount);

      setFilteredClubs(filtered);
    }
  }, [clubs, searchTerm]);

  const handleDeleteClub = async (clubId: string) => {
    if (!window.confirm('Are you sure you want to delete this club? This action cannot be undone.')) return;
    try {
      await deleteDoc(doc(db, 'clubs', clubId));
      toast.success('Club deleted successfully');
      fetchClubs();
    } catch (error) {
      toast.error('Failed to delete club');
      console.error(error);
    }
  };

  const handleEditClub = (clubId: string) => {
    navigate(`/clubs/${clubId}/edit`);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold text-neutral-900">Clubs & Organizations</h1>
        <div className="mt-2 sm:mt-0">
          {(user?.role === 'admin' || user?.role === 'faculty') && (
            <Button
              onClick={() => navigate('/clubs/create')}
              leftIcon={<Plus size={16} />}
            >
              Create Club
            </Button>
          )}
        </div>
      </div>

      {/* Search */}
      <div className="bg-white rounded-lg shadow-sm p-4">
        <Input
          placeholder="Search clubs..."
          leftIcon={<Search size={16} />}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          fullWidth
        />
      </div>

      {/* Clubs Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, index) => (
            <Card key={index} className="animate-pulse">
              <CardBody className="p-6">
                <div className="flex items-center mb-4">
                  <div className="w-16 h-16 bg-neutral-200 rounded-full mr-4"></div>
                  <div className="flex-1">
                    <div className="h-5 bg-neutral-200 rounded w-3/4 mb-2"></div>
                    <div className="h-4 bg-neutral-200 rounded w-1/2"></div>
                  </div>
                </div>
                <div className="h-4 bg-neutral-200 rounded w-full mb-2"></div>
                <div className="h-4 bg-neutral-200 rounded w-full mb-2"></div>
                <div className="h-4 bg-neutral-200 rounded w-3/4"></div>
              </CardBody>
            </Card>
          ))}
        </div>
      ) : filteredClubs.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredClubs.map((club) => (
            <Card
              key={club.id}
              className="transition-transform hover:-translate-y-1 hover:shadow-md relative group"
              hoverable
              onClick={() => navigate(`/clubs/${club.id}`)}
            >
              <CardBody className="p-6">
                <div className="flex items-center mb-4">
                  {club.logo ? (
                    <img
                      src={club.logo}
                      alt={club.name}
                      className="w-16 h-16 rounded-full object-cover mr-4"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-full bg-primary-100 flex items-center justify-center mr-4">
                      <span className="text-xl font-bold text-primary-700">
                        {club.name.charAt(0)}
                      </span>
                    </div>
                  )}
                  <div>
                    <h3 className="text-lg font-semibold text-neutral-900">{club.name}</h3>
                    <p className="text-sm text-neutral-500">{club.memberCount} members</p>
                  </div>
                </div>

                <p className="text-neutral-700 line-clamp-3 mb-4">
                  {club.description}
                </p>

                {club.tags && club.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {club.tags.slice(0, 3).map((tag, index) => (
                      <Badge key={index} variant="neutral" size="sm">
                        {tag}
                      </Badge>
                    ))}
                    {club.tags.length > 3 && (
                      <Badge variant="neutral" size="sm">
                        +{club.tags.length - 3} more
                      </Badge>
                    )}
                  </div>
                )}

                {/* Admin Edit/Delete Buttons */}
                {user?.role === 'admin' && (
                  <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition">
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        handleEditClub(club.id);
                      }}
                      className="bg-blue-600 text-white rounded-full p-1 hover:bg-blue-700"
                      title="Edit Club"
                    >
                      <Pencil size={18} />
                    </button>
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        handleDeleteClub(club.id);
                      }}
                      className="bg-red-600 text-white rounded-full p-1 hover:bg-red-700"
                      title="Delete Club"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                )}
              </CardBody>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardBody className="text-center py-8">
            <Users className="h-12 w-12 text-neutral-400 mx-auto mb-3" />
            <h3 className="text-lg font-medium text-neutral-700">No clubs found</h3>
            <p className="text-neutral-500 mb-4">
              {searchTerm ? (
                <>
                  No clubs match your search criteria. Try a different search term.
                  <br />
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-2"
                    onClick={() => setSearchTerm('')}
                  >
                    Clear Search
                  </Button>
                </>
              ) : (
                'There are no clubs registered at this time.'
              )}
            </p>
            {(user?.role === 'admin' || user?.role === 'faculty') && (
              <Button
                onClick={() => navigate('/clubs/create')}
              >
                Create Club
              </Button>
            )}
          </CardBody>
        </Card>
      )}
    </div>
  );
};

export default Clubs;