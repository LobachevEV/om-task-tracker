import { useState, useEffect } from 'react';
import * as teamApi from '../../shared/api/teamApi';
import type { TeamRosterMember } from '../../shared/api/teamApi';

interface RemovalConfirmation {
  userId: number;
  displayName: string;
}

export default function TeamPage() {
  const [roster, setRoster] = useState<TeamRosterMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [removalConfirmation, setRemovalConfirmation] = useState<RemovalConfirmation | null>(null);
  const [isRemoving, setIsRemoving] = useState(false);

  const loadRoster = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await teamApi.getRoster();
      setRoster(data);
    } catch (err) {
      setError('Error loading roster');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRoster();
  }, []);

  const handleRemoveClick = (userId: number, displayName: string) => {
    setRemovalConfirmation({ userId, displayName });
  };

  const handleConfirmRemoval = async () => {
    if (!removalConfirmation) return;

    try {
      setIsRemoving(true);
      await teamApi.removeMember(removalConfirmation.userId);
      setRemovalConfirmation(null);
      await loadRoster();
    } catch (err) {
      setError('Failed to remove member');
    } finally {
      setIsRemoving(false);
    }
  };

  const handleCancelRemoval = () => {
    setRemovalConfirmation(null);
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return (
      <div>
        <p>{error}</p>
        <button onClick={loadRoster}>Retry</button>
      </div>
    );
  }

  if (roster.length === 0) {
    return <div>No team members</div>;
  }

  // Separate self from others
  const self = roster.find((m) => m.isSelf);
  const others = roster.filter((m) => !m.isSelf);

  // Sort others by lastActive (most recent first), then by displayName
  const sortedOthers = others.sort((a, b) => {
    const dateA = a.status.lastActive ? new Date(a.status.lastActive).getTime() : 0;
    const dateB = b.status.lastActive ? new Date(b.status.lastActive).getTime() : 0;
    if (dateB !== dateA) return dateB - dateA;
    return a.displayName.localeCompare(b.displayName);
  });

  // Display self first, then others
  const displayRoster = self ? [self, ...sortedOthers] : sortedOthers;

  return (
    <div>
      <table>
        <thead>
          <tr>
            <th>Email</th>
            <th>Role</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {displayRoster.map((member) => (
            <tr key={member.userId}>
              <td>{member.email}</td>
              <td>{member.role}</td>
              <td>
                {!member.isSelf && (
                  <button
                    onClick={() => handleRemoveClick(member.userId, member.displayName)}
                    disabled={isRemoving}
                  >
                    Remove
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {removalConfirmation && (
        <div>
          <p>Are you sure you want to remove {removalConfirmation.displayName}?</p>
          <button onClick={handleConfirmRemoval} disabled={isRemoving}>
            Confirm
          </button>
          <button onClick={handleCancelRemoval} disabled={isRemoving}>
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}
