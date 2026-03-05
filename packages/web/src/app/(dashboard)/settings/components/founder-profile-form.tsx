'use client';

import { useState, useEffect, type KeyboardEvent } from 'react';
import { trpc } from '@/lib/trpc/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { X, Plus, Trash2, Briefcase, GraduationCap } from 'lucide-react';
import type { FounderProfile, WorkHistoryEntry, EducationEntry } from '@forge/shared';

const EMPTY_WORK_ENTRY: WorkHistoryEntry = {
  company: '',
  title: '',
  startDate: '',
  endDate: null,
  description: '',
  isCurrent: false,
};

const EMPTY_EDU_ENTRY: EducationEntry = {
  institution: '',
  degree: '',
  fieldOfStudy: '',
  graduationYear: null,
};

export function FounderProfileForm() {
  const { data: user } = trpc.user.me.useQuery();
  const utils = trpc.useUtils();

  const [bio, setBio] = useState('');
  const [skills, setSkills] = useState<string[]>([]);
  const [skillInput, setSkillInput] = useState('');
  const [workHistory, setWorkHistory] = useState<WorkHistoryEntry[]>([]);
  const [education, setEducation] = useState<EducationEntry[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  // Hydrate form from existing profile
  useEffect(() => {
    const profile = user?.founderProfile as FounderProfile | null;
    if (profile) {
      setBio(profile.bio || '');
      setSkills(profile.skills || []);
      setWorkHistory(profile.workHistory || []);
      setEducation(profile.education || []);
    }
  }, [user?.founderProfile]);

  const updateUser = trpc.user.update.useMutation({
    onSuccess: () => {
      utils.user.me.invalidate();
      setSaveMessage('Profile saved successfully');
      setTimeout(() => setSaveMessage(null), 3000);
    },
    onError: (error) => {
      setSaveMessage('Failed to save: ' + error.message);
    },
    onSettled: () => setIsSaving(false),
  });

  const handleSave = () => {
    setIsSaving(true);
    setSaveMessage(null);
    updateUser.mutate({
      founderProfile: { bio, skills, workHistory, education },
    });
  };

  // Skills
  const addSkill = () => {
    const trimmed = skillInput.trim();
    if (trimmed && !skills.includes(trimmed) && skills.length < 20) {
      setSkills([...skills, trimmed]);
      setSkillInput('');
    }
  };

  const handleSkillKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addSkill();
    }
  };

  const removeSkill = (skill: string) => {
    setSkills(skills.filter((s) => s !== skill));
  };

  // Work History
  const addWorkEntry = () => {
    setWorkHistory([...workHistory, { ...EMPTY_WORK_ENTRY }]);
  };

  const updateWorkEntry = (index: number, field: keyof WorkHistoryEntry, value: string | boolean | null) => {
    const updated = [...workHistory];
    updated[index] = { ...updated[index], [field]: value };
    if (field === 'isCurrent' && value === true) {
      updated[index].endDate = null;
    }
    setWorkHistory(updated);
  };

  const removeWorkEntry = (index: number) => {
    setWorkHistory(workHistory.filter((_, i) => i !== index));
  };

  // Education
  const addEduEntry = () => {
    setEducation([...education, { ...EMPTY_EDU_ENTRY }]);
  };

  const updateEduEntry = (index: number, field: keyof EducationEntry, value: string | number | null) => {
    const updated = [...education];
    updated[index] = { ...updated[index], [field]: value };
    setEducation(updated);
  };

  const removeEduEntry = (index: number) => {
    setEducation(education.filter((_, i) => i !== index));
  };

  const hasProfile = bio || skills.length > 0 || workHistory.length > 0 || education.length > 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Founder Profile</CardTitle>
        <CardDescription>
          Your background powers personalized founder-fit scoring across all projects
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Bio */}
        <Textarea
          label="Bio"
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          placeholder="Brief overview of your background, expertise, and what drives you..."
          rows={3}
          maxLength={2000}
        />
        <p className="text-xs text-muted-foreground -mt-4">{bio.length}/2000</p>

        {/* Skills */}
        <div>
          <label className="mb-1.5 block text-sm font-medium text-foreground">
            Skills & Expertise
          </label>
          {skills.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-3">
              {skills.map((skill) => (
                <Badge key={skill} variant="default" className="gap-1 pr-1">
                  {skill}
                  <button
                    type="button"
                    onClick={() => removeSkill(skill)}
                    className="ml-1 rounded-full p-0.5 hover:bg-foreground/10"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}
          <div className="flex gap-2">
            <Input
              value={skillInput}
              onChange={(e) => setSkillInput(e.target.value)}
              onKeyDown={handleSkillKeyDown}
              placeholder="Type a skill and press Enter"
              maxLength={50}
            />
            <Button type="button" variant="outline" size="sm" onClick={addSkill} disabled={skills.length >= 20}>
              Add
            </Button>
          </div>
          {skills.length >= 20 && (
            <p className="mt-1 text-xs text-muted-foreground">Maximum 20 skills reached</p>
          )}
        </div>

        {/* Work History */}
        <div>
          <label className="mb-3 flex items-center gap-2 text-sm font-medium text-foreground">
            <Briefcase className="h-4 w-4" />
            Work History
          </label>
          <div className="space-y-4">
            {workHistory.map((entry, i) => (
              <div key={i} className="rounded-lg border border-border p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <span className="text-sm font-medium text-muted-foreground">Position {i + 1}</span>
                  <button
                    type="button"
                    onClick={() => removeWorkEntry(i)}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Input
                    label="Company"
                    value={entry.company}
                    onChange={(e) => updateWorkEntry(i, 'company', e.target.value)}
                    placeholder="Company name"
                  />
                  <Input
                    label="Title"
                    value={entry.title}
                    onChange={(e) => updateWorkEntry(i, 'title', e.target.value)}
                    placeholder="Job title"
                  />
                  <Input
                    label="Start Date"
                    value={entry.startDate}
                    onChange={(e) => updateWorkEntry(i, 'startDate', e.target.value)}
                    placeholder="YYYY-MM"
                    maxLength={7}
                  />
                  <div>
                    <Input
                      label="End Date"
                      value={entry.isCurrent ? '' : (entry.endDate || '')}
                      onChange={(e) => updateWorkEntry(i, 'endDate', e.target.value || null)}
                      placeholder={entry.isCurrent ? 'Present' : 'YYYY-MM'}
                      maxLength={7}
                      disabled={entry.isCurrent}
                    />
                    <label className="mt-1.5 flex items-center gap-2 text-xs text-muted-foreground">
                      <input
                        type="checkbox"
                        checked={entry.isCurrent}
                        onChange={(e) => updateWorkEntry(i, 'isCurrent', e.target.checked)}
                        className="rounded"
                      />
                      Currently working here
                    </label>
                  </div>
                </div>
                <Textarea
                  label="Description"
                  value={entry.description}
                  onChange={(e) => updateWorkEntry(i, 'description', e.target.value)}
                  placeholder="Key responsibilities and achievements..."
                  rows={2}
                  maxLength={1000}
                />
              </div>
            ))}
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addWorkEntry}
            className="mt-3"
            disabled={workHistory.length >= 20}
          >
            <Plus className="h-4 w-4 mr-1" />
            Add Position
          </Button>
        </div>

        {/* Education */}
        <div>
          <label className="mb-3 flex items-center gap-2 text-sm font-medium text-foreground">
            <GraduationCap className="h-4 w-4" />
            Education
          </label>
          <div className="space-y-4">
            {education.map((entry, i) => (
              <div key={i} className="rounded-lg border border-border p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <span className="text-sm font-medium text-muted-foreground">Education {i + 1}</span>
                  <button
                    type="button"
                    onClick={() => removeEduEntry(i)}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Input
                    label="Institution"
                    value={entry.institution}
                    onChange={(e) => updateEduEntry(i, 'institution', e.target.value)}
                    placeholder="University or school"
                  />
                  <Input
                    label="Degree"
                    value={entry.degree}
                    onChange={(e) => updateEduEntry(i, 'degree', e.target.value)}
                    placeholder="e.g., B.S., M.B.A."
                  />
                  <Input
                    label="Field of Study"
                    value={entry.fieldOfStudy}
                    onChange={(e) => updateEduEntry(i, 'fieldOfStudy', e.target.value)}
                    placeholder="e.g., Computer Science"
                  />
                  <Input
                    label="Graduation Year"
                    value={entry.graduationYear?.toString() || ''}
                    onChange={(e) => {
                      const val = e.target.value;
                      updateEduEntry(i, 'graduationYear', val ? parseInt(val, 10) || null : null);
                    }}
                    placeholder="e.g., 2020"
                    maxLength={4}
                  />
                </div>
              </div>
            ))}
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addEduEntry}
            className="mt-3"
            disabled={education.length >= 10}
          >
            <Plus className="h-4 w-4 mr-1" />
            Add Education
          </Button>
        </div>
      </CardContent>
      <CardFooter className="flex items-center gap-3">
        <Button onClick={handleSave} isLoading={isSaving}>
          Save Profile
        </Button>
        {saveMessage && (
          <p className={`text-sm ${saveMessage.includes('Failed') ? 'text-destructive' : 'text-green-600'}`}>
            {saveMessage}
          </p>
        )}
        {!hasProfile && (
          <p className="text-sm text-muted-foreground">
            Fill in your profile to get personalized founder-fit scoring
          </p>
        )}
      </CardFooter>
    </Card>
  );
}
