'use client';

import { ArrowLeft, Check, Clock3, Sparkles } from 'lucide-react';
import { useState } from 'react';

type GuideAnswer = {
  label: string;
  description: string;
  interests?: string[];
  duration?: 60 | 90 | 120;
};

const guideSteps: Array<{ title: string; description: string; answers: GuideAnswer[] }> = [
  {
    title: '最想关注哪个方向？',
    description: '先选一个主要目标，下一步还可以补充。',
    answers: [
      { label: '硬件与机器人', description: '硬件开发、机器人与设备支持', interests: ['硬件'] },
      { label: '软件与开发', description: '项目开发、软件工具与技术方案', interests: ['软件'] },
      { label: '创客与打样', description: '3D 打印、制作与动手体验', interests: ['创客'] },
      { label: '合作与资源', description: '合作伙伴、赞助商与行业交流', interests: ['合作伙伴'] },
    ],
  },
  {
    title: '还想加入哪类内容？',
    description: '推荐会兼顾你的主要目标和补充方向。',
    answers: [
      { label: '技术活动', description: '关注已确认的分享、演示与活动', interests: ['活动'] },
      { label: '动手体验', description: '优先考虑制作、硬件与创客内容', interests: ['创客', '硬件'] },
      { label: '行业交流', description: '增加合作伙伴与交流机会', interests: ['合作伙伴'] },
      { label: '综合参观', description: '兼顾硬件、软件与现场活动', interests: ['硬件', '软件', '活动'] },
    ],
  },
  {
    title: '这次准备逛多久？',
    description: '后续仍可调整开始时间、离场时间和固定安排。',
    answers: [
      { label: '快速浏览', description: '约 60 分钟', duration: 60 },
      { label: '标准参观', description: '约 90 分钟', duration: 90 },
      { label: '深入交流', description: '约 120 分钟', duration: 120 },
    ],
  },
];

export default function InterestGuide({
  onComplete,
}: {
  onComplete: (interests: string[], duration: 60 | 90 | 120) => void;
}) {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<GuideAnswer[]>([]);
  const current = guideSteps[step];

  function choose(answer: GuideAnswer) {
    const nextAnswers = [...answers.slice(0, step), answer];
    if (step < guideSteps.length - 1) {
      setAnswers(nextAnswers);
      setStep((value) => value + 1);
      return;
    }

    const interests = [...new Set(nextAnswers.flatMap((item) => item.interests ?? []))];
    onComplete(interests, answer.duration ?? 90);
  }

  return (
    <div className="interest-guide">
      <div className="interest-guide-progress" aria-label={`第 ${step + 1} 步，共 ${guideSteps.length} 步`}>
        {guideSteps.map((item, index) => (
          <span className={index <= step ? 'active' : ''} key={item.title} />
        ))}
      </div>

      <div className="interest-guide-heading">
        <span>{step === guideSteps.length - 1 ? <Clock3 size={20} /> : <Sparkles size={20} />}</span>
        <div>
          <small>第 {step + 1} / {guideSteps.length} 步</small>
          <h3>{current.title}</h3>
          <p>{current.description}</p>
        </div>
      </div>

      <div className={`interest-guide-options ${current.answers.length === 3 ? 'three' : ''}`}>
        {current.answers.map((answer) => (
          <button type="button" key={answer.label} onClick={() => choose(answer)}>
            <span><Check size={16} /></span>
            <strong>{answer.label}</strong>
            <small>{answer.description}</small>
          </button>
        ))}
      </div>

      {step > 0 && (
        <button className="interest-guide-back" type="button" onClick={() => setStep((value) => value - 1)}>
          <ArrowLeft size={16} />返回上一步
        </button>
      )}
    </div>
  );
}
