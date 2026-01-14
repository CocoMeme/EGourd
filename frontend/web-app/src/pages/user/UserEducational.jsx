import React, { useState } from 'react';
import { 
  PlayCircle, 
  BookOpen, 
  Lightbulb, 
  ChevronDown, 
  ChevronUp,
  Clock,
  Droplets,
  Sun,
  Leaf,
  Calendar,
  Thermometer,
  Flower2,
  Hand,
  CheckCircle,
  AlertCircle,
  ExternalLink,
  GraduationCap
} from 'lucide-react';
import UserLayout from '../../components/user/UserLayout';
import './UserEducational.css';

const UserEducational = () => {
  const [expandedGuide, setExpandedGuide] = useState(null);

  // Extract YouTube video ID from URL
  const getYouTubeVideoId = (url) => {
    const patterns = [
      /(?:https?:\/\/)?(?:www\.)?youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})/,
      /(?:https?:\/\/)?(?:www\.)?youtu\.be\/([a-zA-Z0-9_-]{11})/,
      /(?:https?:\/\/)?(?:www\.)?youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
    ];
    
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match && match[1]) {
        return match[1];
      }
    }
    return null;
  };

  // Get YouTube thumbnail URL
  const getYouTubeThumbnail = (url) => {
    const videoId = getYouTubeVideoId(url);
    if (!videoId) return null;
    return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
  };

  const videoTutorials = [
    {
      id: 'v1',
      title: 'How to Hand Pollinate Gourds',
      description: 'Step-by-step guide on manual pollination techniques for better fruit production.',
      duration: '5:30',
      url: 'https://www.youtube.com/watch?v=zF_ZQFaaEkc',
      category: 'Pollination',
    },
    {
      id: 'v2',
      title: 'Identifying Male vs Female Flowers',
      description: 'Learn to distinguish between male and female gourd flowers quickly.',
      duration: '3:45',
      url: 'https://www.youtube.com/watch?v=rWodaeBEinM',
      category: 'Identification',
    },
    {
      id: 'v3',
      title: 'Insect and Wind Pollination',
      description: 'Understand the pollination process carried out by insects and wind.',
      duration: '4:20',
      url: 'https://www.youtube.com/watch?v=bAr6Ccg-1PA',
      category: 'Pollination',
    },
  ];

  const guides = [
    {
      id: 'g1',
      title: 'Male vs Female Gourd Flowers',
      icon: Flower2,
      color: '#4a7c59',
      sections: [
        {
          subtitle: 'Male Flowers',
          points: [
            'Appear first, usually 1-2 weeks before female flowers',
            'Grow on long, thin stems',
            'Have a thin stalk with no swelling at the base',
            'Produce pollen on the stamen in the center',
            'More abundant than female flowers',
          ],
        },
        {
          subtitle: 'Female Flowers',
          points: [
            'Have a small gourd-shaped swelling at the base (ovary)',
            'Shorter, thicker stems than male flowers',
            'Contain a stigma that receives pollen',
            'Will develop into fruit if successfully pollinated',
            'Open for only one day, usually early morning',
          ],
        },
        {
          subtitle: 'Visual Identification',
          points: [
            'Look for the miniature gourd at the base - this is ALWAYS female',
            'No swelling at base = male flower',
            'Male flowers outnumber female flowers typically 10:1',
          ],
        },
      ],
    },
    {
      id: 'g2',
      title: 'Hand Pollination Steps',
      icon: Hand,
      color: '#10b981',
      sections: [
        {
          subtitle: 'Best Time',
          points: [
            'Early morning (6-10 AM) when flowers are fresh',
            'Before bees and other pollinators become active',
            'On dry, sunny days for best results',
          ],
        },
        {
          subtitle: 'Step-by-Step Process',
          points: [
            '1. Identify fresh male and female flowers (both must be open)',
            '2. Pick a male flower and remove all petals',
            '3. Gently brush the pollen-covered stamen against the stigma',
            '4. Use one male flower for 2-3 female flowers',
            '5. Mark pollinated flowers with string or ribbon',
            '6. Close female flower petals gently after pollination',
          ],
        },
        {
          subtitle: 'Success Tips',
          points: [
            'Use fresh pollen from flowers that just opened',
            'Pollinate multiple female flowers to increase chances',
            'Track pollination dates for harvest timing',
            'Protect pollinated flowers from insects for a few hours',
          ],
        },
      ],
    },
    {
      id: 'g3',
      title: 'Ripeness Indicators',
      icon: CheckCircle,
      color: '#f59e0b',
      sections: [
        {
          subtitle: 'Visual Signs',
          points: [
            'Skin color changes from light to deep, rich tones',
            'Surface becomes harder and less glossy',
            'Stem begins to dry and turn brown',
            'Tendril near the fruit dries and turns brown',
          ],
        },
        {
          subtitle: 'Physical Tests',
          points: [
            'Knock on the gourd - should sound hollow',
            'Press thumbnail into skin - should resist puncturing',
            'Stem should be dry and woody, not green',
            'Gourd should feel heavy for its size',
          ],
        },
        {
          subtitle: 'Harvest Timing',
          points: [
            'Wait until after first light frost for best hardening',
            'Leave 2-3 inches of stem attached when cutting',
            'Handle carefully to avoid bruising',
            'Cure in dry, warm location for several weeks',
          ],
        },
      ],
    },
    {
      id: 'g4',
      title: 'Common Growing Problems',
      icon: AlertCircle,
      color: '#ef4444',
      sections: [
        {
          subtitle: 'Poor Fruit Set',
          points: [
            'Insufficient pollination - try hand pollination',
            'Too much nitrogen fertilizer - reduce feeding',
            'Extreme temperatures affecting flower development',
            'Lack of male flowers - be patient, they come first',
          ],
        },
        {
          subtitle: 'Fruit Rot',
          points: [
            'Remove rotting fruit immediately to prevent spread',
            'Improve air circulation around plants',
            'Avoid overhead watering - water at base',
            'Elevate fruit off ground with straw or boards',
          ],
        },
        {
          subtitle: 'Yellowing Leaves',
          points: [
            'Normal for older leaves - remove them',
            'Overwatering - reduce watering frequency',
            'Nutrient deficiency - apply balanced fertilizer',
            'Pest damage - inspect for insects',
          ],
        },
      ],
    },
  ];

  const quickFacts = [
    {
      id: 'f1',
      icon: Clock,
      title: 'Flower Lifespan',
      fact: 'Gourd flowers are only viable for pollination for a few hours in the early morning.',
    },
    {
      id: 'f2',
      icon: Droplets,
      title: 'Watering Needs',
      fact: 'Gourds need 1-2 inches of water per week, more during fruit development.',
    },
    {
      id: 'f3',
      icon: Sun,
      title: 'Sunlight',
      fact: 'Gourds require full sun (6-8 hours daily) for optimal growth and fruit production.',
    },
    {
      id: 'f4',
      icon: Leaf,
      title: 'Pollination Success',
      fact: 'Only 20-30% of female flowers naturally get pollinated. Hand pollination increases this to 80-90%.',
    },
    {
      id: 'f5',
      icon: Calendar,
      title: 'Days to Maturity',
      fact: 'Most gourds take 90-120 days from pollination to full maturity.',
    },
    {
      id: 'f6',
      icon: Thermometer,
      title: 'Temperature',
      fact: 'Gourds grow best in temperatures between 70-95°F (21-35°C).',
    },
  ];

  const toggleGuide = (guideId) => {
    setExpandedGuide(expandedGuide === guideId ? null : guideId);
  };

  const handleVideoClick = (url) => {
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <UserLayout>
      <div className="educational-page">
        {/* Welcome Section */}
        <div className="welcome-card">
          <div className="welcome-icon">
            <GraduationCap size={48} />
          </div>
          <h1>Learn About Gourd Cultivation</h1>
          <p>
            Master the art of growing, pollinating, and harvesting gourds with our 
            comprehensive guides and video tutorials.
          </p>
        </div>

        {/* Video Tutorials Section */}
        <section className="content-section">
          <div className="section-header">
            <PlayCircle size={24} />
            <h2>Video Tutorials</h2>
          </div>
          <div className="video-grid">
            {videoTutorials.map((video) => {
              const thumbnailUrl = getYouTubeThumbnail(video.url);
              return (
                <div 
                  key={video.id} 
                  className="video-card"
                  onClick={() => handleVideoClick(video.url)}
                >
                  <div className="video-thumbnail">
                    {thumbnailUrl ? (
                      <img src={thumbnailUrl} alt={video.title} />
                    ) : (
                      <div className="thumbnail-placeholder">
                        <PlayCircle size={48} />
                      </div>
                    )}
                    <div className="play-overlay">
                      <PlayCircle size={56} />
                    </div>
                    <span className="video-duration">{video.duration}</span>
                  </div>
                  <div className="video-info">
                    <span className="video-category">{video.category}</span>
                    <h3>{video.title}</h3>
                    <p>{video.description}</p>
                    <div className="watch-link">
                      Watch on YouTube <ExternalLink size={14} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Quick Facts Section */}
        <section className="content-section">
          <div className="section-header">
            <Lightbulb size={24} />
            <h2>Quick Facts</h2>
          </div>
          <div className="facts-grid">
            {quickFacts.map((item) => {
              const IconComponent = item.icon;
              return (
                <div key={item.id} className="fact-card">
                  <div className="fact-icon">
                    <IconComponent size={28} />
                  </div>
                  <h3>{item.title}</h3>
                  <p>{item.fact}</p>
                </div>
              );
            })}
          </div>
        </section>

        {/* Detailed Guides Section */}
        <section className="content-section">
          <div className="section-header">
            <BookOpen size={24} />
            <h2>Detailed Guides</h2>
          </div>
          <div className="guides-list">
            {guides.map((guide) => {
              const IconComponent = guide.icon;
              const isExpanded = expandedGuide === guide.id;
              return (
                <div key={guide.id} className="guide-card">
                  <button 
                    className="guide-header"
                    onClick={() => toggleGuide(guide.id)}
                  >
                    <div className="guide-header-left">
                      <div 
                        className="guide-icon"
                        style={{ backgroundColor: `${guide.color}15`, color: guide.color }}
                      >
                        <IconComponent size={24} />
                      </div>
                      <span className="guide-title">{guide.title}</span>
                    </div>
                    {isExpanded ? (
                      <ChevronUp size={24} className="chevron" />
                    ) : (
                      <ChevronDown size={24} className="chevron" />
                    )}
                  </button>
                  
                  {isExpanded && (
                    <div className="guide-content">
                      {guide.sections.map((section, index) => (
                        <div key={index} className="guide-section">
                          <h4>{section.subtitle}</h4>
                          <ul>
                            {section.points.map((point, pointIndex) => (
                              <li key={pointIndex}>{point}</li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* Additional Resources */}
        <section className="content-section">
          <div className="section-header">
            <BookOpen size={24} />
            <h2>Additional Resources</h2>
          </div>
          <div className="resources-grid">
            <div className="resource-card">
              <div className="resource-icon help">
                <Lightbulb size={24} />
              </div>
              <div className="resource-content">
                <h3>Need Help?</h3>
                <p>
                  Check our FAQ section or contact support for personalized 
                  assistance with your gourd growing questions.
                </p>
              </div>
            </div>
            <a href="/user/forum" className="resource-card clickable">
              <div className="resource-icon community">
                <BookOpen size={24} />
              </div>
              <div className="resource-content">
                <h3>Community Forum</h3>
                <p>
                  Join our growing community of gourd enthusiasts to share 
                  tips, photos, and experiences.
                </p>
                <span className="resource-link">
                  Join Discussion <ExternalLink size={14} />
                </span>
              </div>
            </a>
          </div>
        </section>
      </div>
    </UserLayout>
  );
};

export default UserEducational;
