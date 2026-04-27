'use client';

import type { ChangeEvent, ReactNode } from 'react';
import { useEffect, useMemo, useState } from 'react';
import type { Center, Cohort, LocalGovernment, Mallam, Pod, State } from '../lib/types';
import { cohortGeographyLabel, mallamGeographyLabel, podGeographyLabel } from '../lib/geography';
import { buildPodLabelParts } from '../lib/pod-naming';

const fieldStyle = {
  display: 'grid',
  gap: 6,
  color: '#475569',
  fontSize: 14,
} as const;

const inputStyle = {
  border: '1px solid #d1d5db',
  borderRadius: 12,
  padding: '12px 14px',
  fontSize: 14,
  width: '100%',
  background: 'white',
} as const;

const twoColumnGrid = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(min(220px, 100%), 1fr))',
  gap: 12,
} as const;

function FieldLabel({ children }: { children: ReactNode }) {
  return <label style={fieldStyle}>{children}</label>;
}

function deriveStateIdFromPod(podId: string | null | undefined, pods: Pod[], centers: Center[]) {
  if (!podId) return '';
  const pod = pods.find((item) => item.id === podId);
  if (!pod) return '';
  const center = centers.find((item) => item.id === pod.centerId);
  return pod.stateId || center?.stateId || '';
}

function deriveLocalGovernmentIdFromPod(podId: string | null | undefined, pods: Pod[], centers: Center[]) {
  if (!podId) return '';
  const pod = pods.find((item) => item.id === podId);
  if (!pod) return '';
  const center = centers.find((item) => item.id === pod.centerId);
  return pod.localGovernmentId || center?.localGovernmentId || '';
}

function deriveStateIdFromCenter(centerId: string | null | undefined, centers: Center[]) {
  if (!centerId) return '';
  return centers.find((item) => item.id === centerId)?.stateId || '';
}

function deriveLocalGovernmentIdFromCenter(centerId: string | null | undefined, centers: Center[]) {
  if (!centerId) return '';
  return centers.find((item) => item.id === centerId)?.localGovernmentId || '';
}

function deriveStateIdFromMallam(mallam: Mallam, centers: Center[]) {
  return deriveStateIdFromCenter(mallam.centerId, centers) || '';
}

function deriveLocalGovernmentIdFromMallam(mallam: Mallam, centers: Center[]) {
  return deriveLocalGovernmentIdFromCenter(mallam.centerId, centers) || '';
}

export function StudentGeographySelectors({
  cohorts,
  pods,
  mallams,
  centers,
  states,
  localGovernments,
  initialStateId,
  initialLocalGovernmentId,
  initialPodId,
  initialCohortId,
  initialMallamId,
}: {
  cohorts: Cohort[];
  pods: Pod[];
  mallams: Mallam[];
  centers: Center[];
  states: State[];
  localGovernments: LocalGovernment[];
  initialStateId?: string | null;
  initialLocalGovernmentId?: string | null;
  initialPodId?: string | null;
  initialCohortId?: string | null;
  initialMallamId?: string | null;
}) {
  const [stateId, setStateId] = useState(initialStateId || deriveStateIdFromPod(initialPodId, pods, centers) || '');
  const [localGovernmentId, setLocalGovernmentId] = useState(initialLocalGovernmentId || deriveLocalGovernmentIdFromPod(initialPodId, pods, centers) || '');
  const [podId, setPodId] = useState(initialPodId || '');
  const [cohortId, setCohortId] = useState(initialCohortId || '');
  const [mallamId, setMallamId] = useState(initialMallamId || '');

  const handleStateChange = (nextStateId: string) => {
    setStateId(nextStateId);
    setLocalGovernmentId('');
    setPodId('');
    setCohortId('');
    setMallamId('');
  };

  const handleLocalGovernmentChange = (nextLocalGovernmentId: string) => {
    setLocalGovernmentId(nextLocalGovernmentId);
    setPodId('');
    setCohortId('');
    setMallamId('');
  };

  const handlePodChange = (nextPodId: string) => {
    setPodId(nextPodId);
    setCohortId('');
    setMallamId('');
  };

  const filteredLocalGovernments = useMemo(
    () => localGovernments.filter((item) => !stateId || item.stateId === stateId),
    [localGovernments, stateId],
  );

  const filteredPods = useMemo(() => {
    return pods.filter((pod) => {
      const center = centers.find((item) => item.id === pod.centerId);
      const podStateId = pod.stateId || center?.stateId || '';
      const podLocalGovernmentId = pod.localGovernmentId || center?.localGovernmentId || '';
      if (stateId && podStateId !== stateId) return false;
      if (localGovernmentId && podLocalGovernmentId !== localGovernmentId) return false;
      return true;
    });
  }, [pods, centers, stateId, localGovernmentId]);

  const filteredCohorts = useMemo(() => {
    if (!podId) return [];
    return cohorts.filter((cohort) => cohort.podId === podId);
  }, [cohorts, podId]);

  const filteredMallams = useMemo(() => {
    if (!podId) return [];
    const selectedPod = pods.find((item) => item.id === podId);
    return mallams.filter((mallam) => {
      const coversPodFromMallam = (mallam.podIds || []).includes(podId);
      const coversPodFromPodRecord = (selectedPod?.mallamIds || []).includes(mallam.id);
      return coversPodFromMallam || coversPodFromPodRecord;
    });
  }, [mallams, pods, podId]);

  useEffect(() => {
    if (localGovernmentId && !filteredLocalGovernments.some((item) => item.id === localGovernmentId)) {
      setLocalGovernmentId('');
    }
  }, [filteredLocalGovernments, localGovernmentId]);

  useEffect(() => {
    if (podId && !filteredPods.some((item) => item.id === podId)) {
      setPodId('');
    }
  }, [filteredPods, podId]);

  useEffect(() => {
    if (cohortId && !filteredCohorts.some((item) => item.id === cohortId)) {
      setCohortId('');
    }
  }, [filteredCohorts, cohortId]);

  useEffect(() => {
    if (!podId) {
      setMallamId('');
      return;
    }

    const derivedMallamId = filteredMallams[0]?.id || '';
    if (derivedMallamId !== mallamId) {
      setMallamId(derivedMallamId);
    }
  }, [filteredMallams, mallamId, podId]);

  useEffect(() => {
    if (!podId) return;
    const derivedStateId = deriveStateIdFromPod(podId, pods, centers);
    const derivedLocalGovernmentId = deriveLocalGovernmentIdFromPod(podId, pods, centers);
    if (derivedStateId && derivedStateId !== stateId) setStateId(derivedStateId);
    if (derivedLocalGovernmentId && derivedLocalGovernmentId !== localGovernmentId) setLocalGovernmentId(derivedLocalGovernmentId);
  }, [podId, pods, centers, stateId, localGovernmentId]);

  return (
    <>
      <div style={twoColumnGrid}>
        <FieldLabel>
          State
          <select name="stateId" value={stateId} onChange={(event) => handleStateChange(event.target.value)} style={inputStyle}>
            <option value="">Select state</option>
            {states.map((state) => <option key={state.id} value={state.id}>{state.name}</option>)}
          </select>
          <span style={{ color: '#64748b', fontSize: 12 }}>{geographySelectHint('state', states.length, 'No states loaded yet')}</span>
        </FieldLabel>
        <FieldLabel>
          Local government
          <select name="localGovernmentId" value={localGovernmentId} onChange={(event) => handleLocalGovernmentChange(event.target.value)} style={inputStyle} disabled={!filteredLocalGovernments.length}>
            <option value="">Select local government</option>
            {filteredLocalGovernments.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select>
          <span style={{ color: '#64748b', fontSize: 12 }}>{geographySelectHint('local government', filteredLocalGovernments.length, stateId ? 'No local governments for this state yet' : 'Pick a state to narrow LGAs')}</span>
        </FieldLabel>
      </div>
      <FieldLabel>
        Pod
        <select name="podId" value={podId} onChange={(event) => handlePodChange(event.target.value)} style={inputStyle} disabled={!filteredPods.length}>
          <option value="">Select pod</option>
          {filteredPods.map((pod) => <option key={pod.id} value={pod.id}>{pod.label} · {podGeographyLabel(pod, centers, states, localGovernments)}</option>)}
        </select>
        <span style={{ color: '#64748b', fontSize: 12 }}>{geographySelectHint('pod', filteredPods.length, localGovernmentId ? 'No pods for this local government yet' : stateId ? 'Pick a local government to narrow pods' : 'Pick state and local government first')}</span>
      </FieldLabel>
      <FieldLabel>
        Cohort
        <select name="cohortId" value={cohortId} onChange={(event) => setCohortId(event.target.value)} style={inputStyle} disabled={!podId}>
          <option value="">{podId ? 'Select cohort' : 'Select pod first'}</option>
          {filteredCohorts.map((cohort) => <option key={cohort.id} value={cohort.id}>{cohort.name} · {cohortGeographyLabel(cohort, pods, centers, states, localGovernments)}</option>)}
        </select>
        <span style={{ color: '#64748b', fontSize: 12 }}>{geographySelectHint('cohort', filteredCohorts.length, podId ? 'No cohorts linked to this pod yet' : 'Pod drives cohort scope')}</span>
      </FieldLabel>
      <input type="hidden" name="mallamId" value={mallamId} />
      <FieldLabel>
        Derived primary mallam
        <div style={{ ...inputStyle, background: '#f8fafc', color: '#0f172a' }}>
          {podId
            ? (filteredMallams[0]?.displayName || filteredMallams[0]?.name || 'No primary mallam linked to this pod yet')
            : 'Select pod first'}
        </div>
        <span style={{ color: '#64748b', fontSize: 12 }}>
          Learners inherit the selected pod’s primary mallam automatically. Change the pod if routing changes; do not hand-wire a separate mallam here.
        </span>
      </FieldLabel>
    </>
  );
}


function geographySelectHint(label: string, count: number, emptyLabel: string) {
  return count ? `${count} ${label}${count === 1 ? '' : 's'} available` : emptyLabel;
}

export function MallamGeographySelectors({
  centers,
  pods,
  states,
  localGovernments,
  initialCenterId,
  initialPodIds,
}: {
  centers: Center[];
  pods: Pod[];
  states: State[];
  localGovernments: LocalGovernment[];
  initialCenterId?: string | null;
  initialPodIds?: string[];
}) {
  const [stateId, setStateId] = useState(deriveStateIdFromCenter(initialCenterId, centers) || '');
  const [localGovernmentId, setLocalGovernmentId] = useState(deriveLocalGovernmentIdFromCenter(initialCenterId, centers) || '');
  const [centerId, setCenterId] = useState(initialCenterId || '');
  const [selectedPodIds, setSelectedPodIds] = useState<string[]>(initialPodIds || []);

  const filteredLocalGovernments = useMemo(
    () => localGovernments.filter((item) => !stateId || item.stateId === stateId),
    [localGovernments, stateId],
  );

  const filteredCenters = useMemo(() => {
    return centers.filter((center) => {
      if (stateId && center.stateId !== stateId) return false;
      if (localGovernmentId && center.localGovernmentId !== localGovernmentId) return false;
      return true;
    });
  }, [centers, stateId, localGovernmentId]);

  const filteredPods = useMemo(() => {
    return pods.filter((pod) => {
      const center = centers.find((item) => item.id === pod.centerId);
      const podStateId = pod.stateId || center?.stateId || '';
      const podLocalGovernmentId = pod.localGovernmentId || center?.localGovernmentId || '';
      if (stateId && podStateId !== stateId) return false;
      if (localGovernmentId && podLocalGovernmentId !== localGovernmentId) return false;
      if (centerId && pod.centerId !== centerId) return false;
      return true;
    });
  }, [pods, centers, stateId, localGovernmentId, centerId]);

  useEffect(() => {
    if (localGovernmentId && !filteredLocalGovernments.some((item) => item.id === localGovernmentId)) {
      setLocalGovernmentId('');
    }
  }, [filteredLocalGovernments, localGovernmentId]);

  useEffect(() => {
    if (centerId && !filteredCenters.some((item) => item.id === centerId)) {
      setCenterId(filteredCenters[0]?.id || '');
    }
  }, [filteredCenters, centerId]);

  useEffect(() => {
    setSelectedPodIds((current) => current.filter((podId) => filteredPods.some((pod) => pod.id === podId)));
  }, [filteredPods]);

  useEffect(() => {
    if (!centerId) return;
    const derivedStateId = deriveStateIdFromCenter(centerId, centers);
    const derivedLocalGovernmentId = deriveLocalGovernmentIdFromCenter(centerId, centers);
    if (derivedStateId && derivedStateId !== stateId) setStateId(derivedStateId);
    if (derivedLocalGovernmentId && derivedLocalGovernmentId !== localGovernmentId) setLocalGovernmentId(derivedLocalGovernmentId);
  }, [centerId, centers, stateId, localGovernmentId]);

  return (
    <>
      <div style={twoColumnGrid}>
        <FieldLabel>
          State
          <select name="stateId" value={stateId} onChange={(event) => { setStateId(event.target.value); setLocalGovernmentId(''); setCenterId(''); }} style={inputStyle}> 
            <option value="">Select state</option>
            {states.map((state) => <option key={state.id} value={state.id}>{state.name}</option>)}
          </select>
          <span style={{ color: '#64748b', fontSize: 12 }}>{geographySelectHint('state', states.length, 'No states loaded yet')}</span>
        </FieldLabel>
        <FieldLabel>
          Local government
          <select name="localGovernmentId" value={localGovernmentId} onChange={(event) => { setLocalGovernmentId(event.target.value); setCenterId(''); }} style={inputStyle}>
            <option value="">Select local government</option>
            {filteredLocalGovernments.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select>
          <span style={{ color: '#64748b', fontSize: 12 }}>{geographySelectHint('local government', filteredLocalGovernments.length, stateId ? 'No local governments for this state yet' : 'Pick a state to narrow LGAs')}</span>
        </FieldLabel>
      </div>
      <FieldLabel>
        Center
        <select name="centerId" value={centerId} onChange={(event) => setCenterId(event.target.value)} style={inputStyle}>
          <option value="">Select center</option>
          {filteredCenters.map((center) => <option key={center.id} value={center.id}>{center.name}</option>)}
        </select>
      </FieldLabel>
      <div style={{ display: 'grid', gap: 10 }}>
        <div style={{ color: '#475569', fontSize: 14, fontWeight: 700 }}>Pod coverage</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(180px, 100%), 1fr))', gap: 10 }}>
          {filteredPods.map((pod) => {
            const checked = selectedPodIds.includes(pod.id);
            return (
              <label key={pod.id} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: '12px 14px', borderRadius: 14, border: '1px solid #e2e8f0', background: '#f8fafc', color: '#334155' }}>
                <input
                  type="checkbox"
                  name="podIds"
                  value={pod.id}
                  checked={checked}
                  onChange={(event) => {
                    setSelectedPodIds((current) => event.target.checked ? [...current, pod.id] : current.filter((item) => item !== pod.id));
                  }}
                  style={{ marginTop: 3 }}
                />
                <span>
                  <strong style={{ display: 'block' }}>{pod.label}</strong>
                  <span style={{ color: '#64748b', fontSize: 13 }}>{podGeographyLabel(pod, centers, states, localGovernments)}</span>
                </span>
              </label>
            );
          })}
        </div>
      </div>
    </>
  );
}


type PodGeographySelectorsProps = {
  centers: Center[];
  states: State[];
  localGovernments: LocalGovernment[];
  initialCenterId?: string | null;
  initialStateId?: string | null;
  initialLocalGovernmentId?: string | null;
  initialPodName?: string | null;
  initialLabel?: string | null;
  showCenter?: boolean;
};

export function PodGeographySelectors({
  centers,
  states,
  localGovernments,
  initialCenterId,
  initialStateId,
  initialLocalGovernmentId,
  initialPodName,
  initialLabel,
  showCenter = true,
}: PodGeographySelectorsProps) {
  const [stateId, setStateId] = useState(initialStateId || deriveStateIdFromCenter(initialCenterId, centers) || '');
  const [localGovernmentId, setLocalGovernmentId] = useState(initialLocalGovernmentId || deriveLocalGovernmentIdFromCenter(initialCenterId, centers) || '');
  const [centerId, setCenterId] = useState(initialCenterId || '');
  const [podName, setPodName] = useState(initialPodName || '');

  const filteredLocalGovernments = useMemo(
    () => localGovernments.filter((item) => !stateId || item.stateId === stateId),
    [localGovernments, stateId],
  );

  const filteredCenters = useMemo(() => {
    return centers.filter((center) => {
      if (stateId && center.stateId !== stateId) return false;
      if (localGovernmentId && center.localGovernmentId !== localGovernmentId) return false;
      return true;
    });
  }, [centers, stateId, localGovernmentId]);

  useEffect(() => {
    if (localGovernmentId && !filteredLocalGovernments.some((item) => item.id === localGovernmentId)) {
      setLocalGovernmentId('');
    }
  }, [filteredLocalGovernments, localGovernmentId]);

  useEffect(() => {
    if (centerId && !filteredCenters.some((item) => item.id === centerId)) {
      setCenterId(filteredCenters[0]?.id || '');
    }
  }, [filteredCenters, centerId]);

  useEffect(() => {
    if (!centerId) return;
    const derivedStateId = deriveStateIdFromCenter(centerId, centers);
    const derivedLocalGovernmentId = deriveLocalGovernmentIdFromCenter(centerId, centers);
    if (derivedStateId && derivedStateId !== stateId) setStateId(derivedStateId);
    if (derivedLocalGovernmentId && derivedLocalGovernmentId !== localGovernmentId) setLocalGovernmentId(derivedLocalGovernmentId);
  }, [centerId, centers, stateId, localGovernmentId]);

  const selectedState = states.find((item) => item.id === stateId) || null;
  const selectedLocalGovernment = localGovernments.find((item) => item.id === localGovernmentId) || null;
  const generatedLabel = buildPodLabelParts({
    stateName: selectedState?.name,
    localGovernmentName: selectedLocalGovernment?.name,
    podName,
  }).label;

  const handlePodNameChange = (event: ChangeEvent<HTMLInputElement>) => {
    setPodName(event.target.value);
  };

  return (
    <>
      <input type="hidden" name="stateId" value={stateId} />
      <input type="hidden" name="localGovernmentId" value={localGovernmentId} />
      <div style={twoColumnGrid}>
        <FieldLabel>
          State
          <select value={stateId} onChange={(event) => { setStateId(event.target.value); setLocalGovernmentId(''); setCenterId(''); }} style={inputStyle}>
            <option value="">Select state</option>
            {states.map((state) => <option key={state.id} value={state.id}>{state.name}</option>)}
          </select>
          <span style={{ color: '#64748b', fontSize: 12 }}>{geographySelectHint('state', states.length, 'No states loaded yet')}</span>
        </FieldLabel>
        <FieldLabel>
          Local government
          <select value={localGovernmentId} onChange={(event) => { setLocalGovernmentId(event.target.value); setCenterId(''); }} style={inputStyle}>
            <option value="">Select local government</option>
            {filteredLocalGovernments.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select>
          <span style={{ color: '#64748b', fontSize: 12 }}>{geographySelectHint('local government', filteredLocalGovernments.length, stateId ? 'No local governments for this state yet' : 'Pick a state to narrow LGAs')}</span>
        </FieldLabel>
      </div>
      <input type="hidden" name="centerId" value={centerId} />
      {showCenter ? (
        <FieldLabel>
          Center
          <select name="centerId" value={centerId} onChange={(event) => setCenterId(event.target.value)} style={inputStyle}>
            <option value="">Select center</option>
            {filteredCenters.map((center) => <option key={center.id} value={center.id}>{center.name}</option>)}
          </select>
        </FieldLabel>
      ) : null}
      <FieldLabel>
        Pod short name
        <input name="podName" value={podName} onChange={handlePodNameChange} placeholder="Pod_name" style={inputStyle} />
        <span style={{ color: '#64748b', fontSize: 12 }}>Use the human-readable suffix only. We generate the final pod label for you.</span>
      </FieldLabel>
      <FieldLabel>
        Generated pod label
        <input name="label" value={generatedLabel || initialLabel || ''} readOnly style={{ ...inputStyle, background: '#f8fafc', fontWeight: 700 }} />
        <span style={{ color: '#64748b', fontSize: 12 }}>Format: state-LG-Pod_name</span>
      </FieldLabel>
    </>
  );
}
