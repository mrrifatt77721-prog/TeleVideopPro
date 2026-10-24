import React, { useState } from 'react';
import { Header, Modal } from '../ui.jsx';
import VideoForm from './VideoForm.jsx';
import ManageVideos from './ManageVideos.jsx';
import { NoticeEditor, BrandingEditor, SponsorEditor } from './SettingsEditors.jsx';

const TABS = [
  ['upload', '⬆ Upload'],
  ['manage', '🎞 Manage'],
  ['notice', '📢 Notices'],
  ['brand', '🎨 Branding'],
  ['sponsor', '💰 Sponsor'],
];

export default function AdminPanel({ onClose }) {
  const [tab, setTab] = useState('upload');
  const [editing, setEditing] = useState(null);

  const edit = (v) => { setEditing(v); setTab('upload'); };
  const tabTo = (t) => { if (t !== 'upload') setEditing(null); setTab(t); };

  return (
    <Modal onClose={onClose} full z={80}>
      <Header title="Admin Control Panel" onClose={onClose} />
      <div className="sticky top-[53px] z-10 flex gap-1.5 overflow-x-auto border-b border-line bg-bg/90 px-3 py-2 backdrop-blur">
        {TABS.map(([k, l]) => (
          <button key={k} onClick={() => tabTo(k)}
            className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${tab === k ? 'text-white' : 'bg-card2 text-mute'}`}
            style={tab === k ? { background: 'linear-gradient(135deg,var(--accent),var(--accent2))' } : undefined}>{l}</button>
        ))}
      </div>
      <div className="p-4">
        {tab === 'upload' && (
          <VideoForm key={editing?._id || 'new'} initial={editing}
            onSaved={() => { setEditing(null); if (editing) setTab('manage'); }}
            onCancel={editing ? () => { setEditing(null); setTab('manage'); } : null} />
        )}
        {tab === 'manage' && <ManageVideos onEdit={edit} />}
        {tab === 'notice' && <NoticeEditor />}
        {tab === 'brand' && <BrandingEditor />}
        {tab === 'sponsor' && <SponsorEditor />}
      </div>
    </Modal>
  );
}
