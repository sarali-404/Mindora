import { useState, useEffect } from 'react';
import {
    RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
    AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer
} from 'recharts';
import styles from './KnowledgeDashboard.module.css';
import goalService from '../../services/goalService';

export default function KnowledgeDashboard({ goalId, topics = [] }) {
    const [knowledgeState, setKnowledgeState] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [activeTab, setActiveTab] = useState('overview');

    useEffect(() => {
        if (!goalId) return;
        fetchKnowledgeState();
    }, [goalId]);

    const fetchKnowledgeState = async () => {
        try {
            setLoading(true);
            setError(null);
            const response = await goalService.getKnowledgeState(goalId);
            setKnowledgeState(response.data);
        } catch (err) {
            setError('Unable to load knowledge insights yet. Take a quiz to get started!');
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <section className={styles.card}>
                <div className={styles.loadingState}>
                    <div className={styles.spinner} />
                    <p>Analyzing your knowledge...</p>
                </div>
            </section>
        );
    }

    if (error || !knowledgeState) {
        return (
            <section className={styles.card}>
                <header className={styles.header}>
                    <div className={styles.headerLeft}>
                        <div className={styles.iconCircle}>🧠</div>
                        <h2 className={styles.title}>Knowledge Insights</h2>
                    </div>
                </header>
                <div className={styles.emptyState}>
                    <div className={styles.emptyIcon}>📊</div>
                    <h3>No Data Yet</h3>
                    <p>{error || 'Complete some quizzes or read notes to unlock your knowledge insights.'}</p>
                </div>
            </section>
        );
    }

    const { overallScore, overallTrend, coverage, topicScores, strongTopics, weakTopics, untouchedTopics } = knowledgeState;

    // Radar chart data
    const radarData = Object.entries(topicScores).map(([name, data]) => ({
        topic: name.length > 15 ? name.substring(0, 14) + '…' : name,
        fullName: name,
        score: data.score,
        fullMark: 100
    }));

    // Learning velocity data (mock time series from topic scores)
    const velocityData = Object.entries(topicScores)
        .filter(([, data]) => data.details.totalActivities > 0)
        .map(([name, data]) => ({
            topic: name.length > 12 ? name.substring(0, 11) + '…' : name,
            score: data.score,
            quizAvg: data.details.avgQuizScore,
            activities: data.details.totalActivities
        }));

    const trendIcon = overallTrend === 'improving' ? '📈' : overallTrend === 'declining' ? '📉' : '➡️';
    const trendColor = overallTrend === 'improving' ? '#10b981' : overallTrend === 'declining' ? '#ef4444' : '#6b7280';
    const scoreColor = overallScore >= 75 ? '#10b981' : overallScore >= 40 ? '#f59e0b' : '#ef4444';

    return (
        <section className={styles.card}>
            <header className={styles.header}>
                <div className={styles.headerLeft}>
                    <div className={styles.iconCircle}>🧠</div>
                    <h2 className={styles.title}>Knowledge Insights</h2>
                </div>
                <button className={styles.refreshBtn} onClick={fetchKnowledgeState} title="Refresh">
                    🔄
                </button>
            </header>

            {/* Score Overview */}
            <div className={styles.scoreOverview}>
                <div className={styles.mainScore}>
                    <div className={styles.scoreRing} style={{ '--score-color': scoreColor, '--score-pct': `${overallScore}%` }}>
                        <span className={styles.scoreValue}>{overallScore}</span>
                        <span className={styles.scoreLabel}>/ 100</span>
                    </div>
                    <div className={styles.scoreInfo}>
                        <h3>Overall Knowledge</h3>
                        <span className={styles.trendBadge} style={{ color: trendColor }}>
                            {trendIcon} {overallTrend}
                        </span>
                    </div>
                </div>

                <div className={styles.statsRow}>
                    <div className={styles.stat}>
                        <span className={styles.statValue}>{coverage}%</span>
                        <span className={styles.statLabel}>Coverage</span>
                    </div>
                    <div className={styles.stat}>
                        <span className={styles.statValue} style={{ color: '#10b981' }}>{strongTopics?.length || 0}</span>
                        <span className={styles.statLabel}>Strong</span>
                    </div>
                    <div className={styles.stat}>
                        <span className={styles.statValue} style={{ color: '#ef4444' }}>{weakTopics?.length || 0}</span>
                        <span className={styles.statLabel}>Weak</span>
                    </div>
                    <div className={styles.stat}>
                        <span className={styles.statValue} style={{ color: '#6b7280' }}>{untouchedTopics?.length || 0}</span>
                        <span className={styles.statLabel}>Untouched</span>
                    </div>
                </div>
            </div>

            {/* Tab Navigation */}
            <nav className={styles.tabs}>
                {[
                    { key: 'overview', label: '📊 Radar' },
                    { key: 'velocity', label: '📈 Velocity' },
                    { key: 'topics', label: '📋 Topics' }
                ].map(tab => (
                    <button
                        key={tab.key}
                        className={`${styles.tab} ${activeTab === tab.key ? styles.tabActive : ''}`}
                        onClick={() => setActiveTab(tab.key)}
                    >
                        {tab.label}
                    </button>
                ))}
            </nav>

            {/* Tab Content */}
            <div className={styles.tabContent}>
                {activeTab === 'overview' && radarData.length > 0 && (
                    <div className={styles.chartContainer}>
                        <ResponsiveContainer width="100%" height={280}>
                            <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="70%">
                                <PolarGrid stroke="#334155" />
                                <PolarAngleAxis dataKey="topic" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: '#64748b', fontSize: 10 }} />
                                <Radar
                                    name="Knowledge"
                                    dataKey="score"
                                    stroke="#8b5cf6"
                                    fill="#8b5cf6"
                                    fillOpacity={0.25}
                                    strokeWidth={2}
                                />
                            </RadarChart>
                        </ResponsiveContainer>
                    </div>
                )}

                {activeTab === 'velocity' && velocityData.length > 0 && (
                    <div className={styles.chartContainer}>
                        <ResponsiveContainer width="100%" height={250}>
                            <AreaChart data={velocityData}>
                                <defs>
                                    <linearGradient id="knowledgeGrad" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                                    </linearGradient>
                                    <linearGradient id="quizGrad" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <XAxis dataKey="topic" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                                <YAxis domain={[0, 100]} tick={{ fill: '#64748b', fontSize: 10 }} />
                                <Tooltip
                                    contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8, color: '#e2e8f0' }}
                                />
                                <Area type="monotone" dataKey="score" stroke="#8b5cf6" fill="url(#knowledgeGrad)" strokeWidth={2} name="Knowledge Score" />
                                <Area type="monotone" dataKey="quizAvg" stroke="#3b82f6" fill="url(#quizGrad)" strokeWidth={2} name="Quiz Average" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                )}

                {activeTab === 'topics' && (
                    <div className={styles.topicsList}>
                        {Object.entries(topicScores)
                            .sort(([, a], [, b]) => a.score - b.score)
                            .map(([name, data]) => (
                                <div key={name} className={styles.topicRow}>
                                    <div className={styles.topicInfo}>
                                        <span className={styles.topicLevel} data-level={data.level}>
                                            {data.level === 'mastered' ? '⭐' : data.level === 'strong' ? '💪' : data.level === 'developing' ? '📚' : data.level === 'weak' ? '⚠️' : '❓'}
                                        </span>
                                        <div>
                                            <span className={styles.topicName}>{name}</span>
                                            <span className={styles.topicMeta}>
                                                {data.details.quizAttempts} quizzes • {data.details.trend}
                                            </span>
                                        </div>
                                    </div>
                                    <div className={styles.topicScore}>
                                        <div className={styles.progressBar}>
                                            <div
                                                className={styles.progressFill}
                                                style={{
                                                    width: `${data.score}%`,
                                                    background: data.score >= 75 ? '#10b981' : data.score >= 40 ? '#f59e0b' : '#ef4444'
                                                }}
                                            />
                                        </div>
                                        <span className={styles.scoreText}>{data.score}</span>
                                    </div>
                                </div>
                            ))}
                    </div>
                )}
            </div>

            {/* Study Recommendations */}
            {(weakTopics?.length > 0 || untouchedTopics?.length > 0) && (
                <div className={styles.recommendations}>
                    <h4 className={styles.recTitle}>📌 Focus Areas</h4>
                    <div className={styles.recList}>
                        {weakTopics?.map(topic => (
                            <span key={topic} className={`${styles.recTag} ${styles.weakTag}`}>
                                ⚠️ {topic}
                            </span>
                        ))}
                        {untouchedTopics?.slice(0, 3).map(topic => (
                            <span key={topic} className={`${styles.recTag} ${styles.untouchedTag}`}>
                                ❓ {topic}
                            </span>
                        ))}
                    </div>
                </div>
            )}
        </section>
    );
}
