import type { ReactNode } from 'react';
import { registerLessonAssetAction, uploadLessonAssetAction } from '../app/actions';
import type { CurriculumModule, Lesson, LessonAsset, Subject } from '../lib/types';

const cardStyle = { background: 'white', borderRadius: 20, padding: 24, display: 'grid', gap: 16, border: '1px solid #eef2f7', boxShadow: '0 10px 30px rgba(15, 23, 42, 0.04)' } as const;
const inputStyle = { border: '1px solid #d1d5db', borderRadius: 12, padding: '12px 14px', fontSize: 14, width: '100%', background: 'white' } as const;
const buttonStyle = { background: '#4F46E5', color: 'white', border: 0, borderRadius: 12, padding: '12px 16px', fontWeight: 700 } as const;

function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label style={{ display: 'grid', gap: 6, color: '#475569', fontSize: 14 }}>{label}{children}</label>;
}

function ScopeFields({ subjects, modules, lessons }: { subjects: Subject[]; modules: CurriculumModule[]; lessons: Lesson[] }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
      <Field label="Subject"><select name="subjectId" defaultValue="" style={inputStyle}><option value="">Unscoped</option>{subjects.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></Field>
      <Field label="Module"><select name="moduleId" defaultValue="" style={inputStyle}><option value="">Unscoped</option>{modules.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}</select></Field>
      <Field label="Lesson"><select name="lessonId" defaultValue="" style={inputStyle}><option value="">Unscoped</option>{lessons.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}</select></Field>
    </div>
  );
}

const assetKinds = ['image', 'audio', 'illustration', 'prompt-card', 'story-card', 'trace-card', 'letter-card', 'tile', 'word-card', 'hint', 'transcript'];

export function AssetUploadForm({ returnPath, subjects, modules, lessons }: { returnPath: string; subjects: Subject[]; modules: CurriculumModule[]; lessons: Lesson[] }) {
  return <form action={uploadLessonAssetAction} style={cardStyle}>
    <input type="hidden" name="returnPath" value={returnPath} />
    <h2 style={{ margin: 0 }}>Upload media</h2>
    <div style={{ color: '#64748b', lineHeight: 1.6 }}>Fast safe V1: uploads land in API-backed storage, then the registry keeps the canonical runtime URL and scope metadata.</div>
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
      <Field label="Kind"><select name="kind" defaultValue="image" style={inputStyle}>{assetKinds.map((kind) => <option key={kind} value={kind}>{kind}</option>)}</select></Field>
      <Field label="Title"><input name="title" placeholder="Nurse card" style={inputStyle} /></Field>
      <Field label="Tags"><input name="tags" placeholder="english, helpers, card" style={inputStyle} /></Field>
    </div>
    <Field label="Description"><input name="description" placeholder="Shown during community helpers picture talk" style={inputStyle} /></Field>
    <Field label="File"><input name="file" type="file" style={inputStyle} /></Field>
    <ScopeFields subjects={subjects} modules={modules} lessons={lessons} />
    <button style={buttonStyle}>Upload asset</button>
  </form>;
}

export function AssetRegisterForm({ returnPath, subjects, modules, lessons }: { returnPath: string; subjects: Subject[]; modules: CurriculumModule[]; lessons: Lesson[] }) {
  return <form action={registerLessonAssetAction} style={cardStyle}>
    <input type="hidden" name="returnPath" value={returnPath} />
    <h2 style={{ margin: 0 }}>Register external asset</h2>
    <div style={{ color: '#64748b', lineHeight: 1.6 }}>If the file already exists in a CDN, object store, or legacy bucket, register it here and still make it browseable to authors.</div>
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
      <Field label="Kind"><select name="kind" defaultValue="image" style={inputStyle}>{assetKinds.map((kind) => <option key={kind} value={kind}>{kind}</option>)}</select></Field>
      <Field label="Title"><input name="title" placeholder="Short vowel song" style={inputStyle} /></Field>
      <Field label="Tags"><input name="tags" placeholder="phonics, audio" style={inputStyle} /></Field>
    </div>
    <Field label="Description"><input name="description" placeholder="Existing hosted audio cue" style={inputStyle} /></Field>
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
      <Field label="Runtime URL"><input name="fileUrl" placeholder="https://cdn.example.com/audio/short-vowel-song.mp3" style={inputStyle} /></Field>
      <Field label="Storage path / asset key"><input name="storagePath" placeholder="s3://bucket/audio/short-vowel-song.mp3" style={inputStyle} /></Field>
    </div>
    <ScopeFields subjects={subjects} modules={modules} lessons={lessons} />
    <button style={buttonStyle}>Register asset</button>
  </form>;
}

export function AssetLibraryTable({ items }: { items: LessonAsset[] }) {
  return <div style={{ background: 'white', borderRadius: 20, padding: 24, border: '1px solid #eef2f7', boxShadow: '0 10px 30px rgba(15, 23, 42, 0.04)' }}>
    <div style={{ display: 'grid', gap: 14 }}>
      <div>
        <h2 style={{ margin: 0 }}>Browse library</h2>
        <div style={{ color: '#64748b', lineHeight: 1.6, marginTop: 6 }}>V1 picker flow: browse here, then paste the runtime URL or asset key into lesson step media fields. No hidden magic, no brittle modal spaghetti.</div>
      </div>
      <div style={{ display: 'grid', gap: 12 }}>
        {items.length ? items.map((item) => <div key={item.id} style={{ padding: 16, borderRadius: 16, border: '1px solid #E2E8F0', background: '#F8FAFC', display: 'grid', gap: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontWeight: 800, color: '#0f172a' }}>{item.title}</div>
              <div style={{ color: '#64748b', fontSize: 13 }}>{item.kind} • {item.subjectName ?? 'Unscoped'}{item.moduleTitle ? ` • ${item.moduleTitle}` : ''}{item.lessonTitle ? ` • ${item.lessonTitle}` : ''}</div>
            </div>
            <div style={{ color: '#475569', fontSize: 13 }}>{item.originalFileName ?? item.fileName ?? item.id}</div>
          </div>
          {item.fileUrl && item.kind === 'image' ? <img src={item.fileUrl} alt={item.title} style={{ maxWidth: 240, maxHeight: 140, objectFit: 'cover', borderRadius: 12, border: '1px solid #E2E8F0', background: '#fff' }} /> : null}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 10 }}>
            <div style={{ padding: 12, borderRadius: 12, background: '#fff', border: '1px solid #E2E8F0' }}><strong>Runtime URL</strong><div style={{ color: '#475569', marginTop: 6, wordBreak: 'break-all' }}>{item.fileUrl ?? '—'}</div></div>
            <div style={{ padding: 12, borderRadius: 12, background: '#fff', border: '1px solid #E2E8F0' }}><strong>Asset key / path</strong><div style={{ color: '#475569', marginTop: 6, wordBreak: 'break-all' }}>{item.storagePath ?? item.fileName ?? item.id}</div></div>
          </div>
        </div>) : <div style={{ color: '#64748b' }}>No assets yet. Upload one above and the library becomes your picker source immediately.</div>}
      </div>
    </div>
  </div>;
}
