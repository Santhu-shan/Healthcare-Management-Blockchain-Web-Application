import { useState, useEffect } from 'react';
import { Search, UserPlus, Stethoscope, Mail, Phone, Building2, BadgeCheck } from 'lucide-react';
import Layout from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { supabase } from '@/integrations/supabase/client';
import { Doctor } from '@/types';
import { cn } from '@/lib/utils';

export default function Doctors() {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);

  useEffect(() => {
    loadDoctors();
  }, []);

  const loadDoctors = async () => {
    const { data } = await supabase.from('doctors').select('*').order('name');
    setDoctors((data || []) as Doctor[]);
    setLoading(false);
  };

  const filteredDoctors = doctors.filter(doc =>
    doc.name.toLowerCase().includes(search.toLowerCase()) ||
    doc.specialization.toLowerCase().includes(search.toLowerCase()) ||
    doc.department.toLowerCase().includes(search.toLowerCase())
  );

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  };

  const getSpecializationColor = (spec: string) => {
    const colors: Record<string, string> = {
      'Cardiologist': 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
      'Pulmonologist': 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
      'Internal Medicine': 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
      'Emergency Medicine': 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
      'Neurologist': 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
    };
    return colors[spec] || 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400';
  };

  if (loading) return <Layout><div className="flex items-center justify-center h-64">Loading...</div></Layout>;

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold font-display">Doctor Management</h1>
            <p className="text-muted-foreground">Manage healthcare providers and their credentials</p>
          </div>
          <Button className="gap-2">
            <UserPlus className="h-4 w-4" />
            Add Doctor
          </Button>
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, specialization, or department..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Stethoscope className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{doctors.length}</p>
                <p className="text-xs text-muted-foreground">Total Doctors</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-consensus/10 flex items-center justify-center">
                <BadgeCheck className="h-5 w-5 text-consensus" />
              </div>
              <div>
                <p className="text-2xl font-bold">{doctors.filter(d => d.is_active).length}</p>
                <p className="text-xs text-muted-foreground">Active</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-warning/10 flex items-center justify-center">
                <Building2 className="h-5 w-5 text-warning" />
              </div>
              <div>
                <p className="text-2xl font-bold">{new Set(doctors.map(d => d.department)).size}</p>
                <p className="text-xs text-muted-foreground">Departments</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-block/10 flex items-center justify-center">
                <Stethoscope className="h-5 w-5 text-block" />
              </div>
              <div>
                <p className="text-2xl font-bold">{new Set(doctors.map(d => d.specialization)).size}</p>
                <p className="text-xs text-muted-foreground">Specializations</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Doctor Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredDoctors.map((doctor) => (
                <Card 
                  key={doctor.id} 
                  className={cn(
                    "cursor-pointer transition-all hover:shadow-md",
                    selectedDoctor?.id === doctor.id && "ring-2 ring-primary"
                  )}
                  onClick={() => setSelectedDoctor(doctor)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                      <Avatar className="h-12 w-12">
                        <AvatarFallback className="bg-primary/10 text-primary font-medium">
                          {getInitials(doctor.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold truncate">{doctor.name}</h3>
                          {doctor.is_active && (
                            <span className="h-2 w-2 rounded-full bg-consensus" />
                          )}
                        </div>
                        <Badge className={cn("mt-1", getSpecializationColor(doctor.specialization))}>
                          {doctor.specialization}
                        </Badge>
                        <p className="text-xs text-muted-foreground mt-2">
                          {doctor.department}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Doctor Details */}
          <Card className="sticky top-20 h-fit">
            <CardHeader>
              <CardTitle>Doctor Details</CardTitle>
              <CardDescription>Select a doctor to view details</CardDescription>
            </CardHeader>
            <CardContent>
              {selectedDoctor ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <Avatar className="h-16 w-16">
                      <AvatarFallback className="bg-primary/10 text-primary text-xl font-medium">
                        {getInitials(selectedDoctor.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h3 className="text-lg font-semibold">{selectedDoctor.name}</h3>
                      <Badge className={getSpecializationColor(selectedDoctor.specialization)}>
                        {selectedDoctor.specialization}
                      </Badge>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-xs text-muted-foreground">Department</p>
                        <p className="font-medium">{selectedDoctor.department}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                      <BadgeCheck className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-xs text-muted-foreground">License Number</p>
                        <p className="font-mono font-medium">{selectedDoctor.license_number}</p>
                      </div>
                    </div>

                    {selectedDoctor.contact_email && (
                      <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-xs text-muted-foreground">Email</p>
                          <p className="font-medium text-sm">{selectedDoctor.contact_email}</p>
                        </div>
                      </div>
                    )}

                    {selectedDoctor.contact_phone && (
                      <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-xs text-muted-foreground">Phone</p>
                          <p className="font-medium">{selectedDoctor.contact_phone}</p>
                        </div>
                      </div>
                    )}

                    <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                      <span className="text-sm">Status</span>
                      <Badge className={selectedDoctor.is_active ? 'bg-consensus' : 'bg-muted-foreground'}>
                        {selectedDoctor.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>

                    <div className="pt-2 text-xs text-muted-foreground">
                      <p>Joined: {new Date(selectedDoctor.created_at).toLocaleDateString()}</p>
                      <p>Last Updated: {new Date(selectedDoctor.updated_at).toLocaleDateString()}</p>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-8">
                  Select a doctor from the list to view their details
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}
