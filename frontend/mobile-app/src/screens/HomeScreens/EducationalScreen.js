import React, { useState } from 'react';
import { SafeAreaView, View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../styles';
import { useTranslation } from 'react-i18next';

const EducationalScreen = ({ navigation }) => {
  const { t } = useTranslation();
  const [expandedSection, setExpandedSection] = useState(null);

  // Extract YouTube video ID from URL
  const getYouTubeVideoId = (url) => {
    // Handle different YouTube URL formats
    const patterns = [
      /(?:https?:\/\/)?(?:www\.)?youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})/,
      /(?:https?:\/\/)?(?:www\.)?youtu\.be\/([a-zA-Z0-9_-]{11})/,
      /(?:https?:\/\/)?(?:www\.)?youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
      /(?:https?:\/\/)?(?:www\.)?youtube\.com\/v\/([a-zA-Z0-9_-]{11})/,
    ];
    
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match && match[1]) {
        return match[1];
      }
    }
    return null;
  };

  // Get YouTube thumbnail URL with fallback options
  const getYouTubeThumbnail = (url) => {
    const videoId = getYouTubeVideoId(url);
    if (!videoId) return null;
    
    // Try different thumbnail qualities
    // maxresdefault (1280x720), hqdefault (480x360), mqdefault (320x180), default (120x90)
    return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
  };

  const videoTutorials = [
    {
      id: 'v1',
      title: t('educational.video.pollinationTitle'),
      description: t('educational.video.pollinationDesc'),
      duration: '5:30',
      thumbnail: null,
      url: 'https://www.youtube.com/watch?v=zF_ZQFaaEkc',
      category: t('educational.video.pollination'),
    },
    {
      id: 'v2',
      title: t('educational.video.identifyingTitle'),
      description: t('educational.video.identifyingDesc'),
      duration: '3:45',
      thumbnail: null,
      url: 'https://www.youtube.com/watch?v=rWodaeBEinM',
      category: t('educational.video.identification'),
    },
    {
      id: 'v3',
      title: t('educational.video.insectTitle'),
      description: t('educational.video.insectDesc'),
      duration: '4:20',
      thumbnail: null,
      url: 'https://www.youtube.com/watch?v=bAr6Ccg-1PA',
      category: t('educational.video.pollination'),
    },
  ];

  const guides = [
    {
      id: 'g1',
      title: t('educational.guide.maleFemaleTitle'),
      icon: 'flower-outline',
      color: theme.colors.primary,
      sections: [
        {
          subtitle: t('educational.guide.maleFlowers'),
          points: [
            t('educational.guide.malePoint1'),
            t('educational.guide.malePoint2'),
            t('educational.guide.malePoint3'),
            t('educational.guide.malePoint4'),
            t('educational.guide.malePoint5'),
          ],
        },
        {
          subtitle: t('educational.guide.femaleFlowers'),
          points: [
            t('educational.guide.femalePoint1'),
            t('educational.guide.femalePoint2'),
            t('educational.guide.femalePoint3'),
            t('educational.guide.femalePoint4'),
            t('educational.guide.femalePoint5'),
          ],
        },
        {
          subtitle: t('educational.guide.visualId'),
          points: [
            t('educational.guide.visualPoint1'),
            t('educational.guide.visualPoint2'),
            t('educational.guide.visualPoint3'),
          ],
        },
      ],
    },
    {
      id: 'g2',
      title: t('educational.guide.pollinationStepsTitle'),
      icon: 'hand-right-outline',
      color: theme.colors.success,
      sections: [
        {
          subtitle: t('educational.guide.bestTime'),
          points: [
            t('educational.guide.bestTimePoint1'),
            t('educational.guide.bestTimePoint2'),
            t('educational.guide.bestTimePoint3'),
          ],
        },
        {
          subtitle: t('educational.guide.stepByStep'),
          points: [
            t('educational.guide.stepPoint1'),
            t('educational.guide.stepPoint2'),
            t('educational.guide.stepPoint3'),
            t('educational.guide.stepPoint4'),
            t('educational.guide.stepPoint5'),
            t('educational.guide.stepPoint6'),
          ],
        },
        {
          subtitle: t('educational.guide.successTips'),
          points: [
            t('educational.guide.successTip1'),
            t('educational.guide.successTip2'),
            t('educational.guide.successTip3'),
            t('educational.guide.successTip4'),
          ],
        },
      ],
    },
    {
      id: 'g3',
      title: t('educational.guide.ripenessTitle'),
      icon: 'checkmark-circle-outline',
      color: theme.colors.warning,
      sections: [
        {
          subtitle: t('educational.guide.visualSigns'),
          points: [
            t('educational.guide.visualSignPoint1'),
            t('educational.guide.visualSignPoint2'),
            t('educational.guide.visualSignPoint3'),
            t('educational.guide.visualSignPoint4'),
          ],
        },
        {
          subtitle: t('educational.guide.physicalTests'),
          points: [
            t('educational.guide.physicalTestPoint1'),
            t('educational.guide.physicalTestPoint2'),
            t('educational.guide.physicalTestPoint3'),
            t('educational.guide.physicalTestPoint4'),
          ],
        },
        {
          subtitle: t('educational.guide.harvestTiming'),
          points: [
            t('educational.guide.harvestTimingPoint1'),
            t('educational.guide.harvestTimingPoint2'),
            t('educational.guide.harvestTimingPoint3'),
            t('educational.guide.harvestTimingPoint4'),
          ],
        },
      ],
    },
    {
      id: 'g4',
      title: t('educational.guide.growingProblemsTitle'),
      icon: 'alert-circle-outline',
      color: theme.colors.error,
      sections: [
        {
          subtitle: t('educational.guide.poorFruitSet'),
          points: [
            t('educational.guide.poorFruitPoint1'),
            t('educational.guide.poorFruitPoint2'),
            t('educational.guide.poorFruitPoint3'),
            t('educational.guide.poorFruitPoint4'),
          ],
        },
        {
          subtitle: t('educational.guide.fruitRot'),
          points: [
            t('educational.guide.fruitRotPoint1'),
            t('educational.guide.fruitRotPoint2'),
            t('educational.guide.fruitRotPoint3'),
            t('educational.guide.fruitRotPoint4'),
          ],
        },
        {
          subtitle: t('educational.guide.yellowingLeaves'),
          points: [
            t('educational.guide.yellowingPoint1'),
            t('educational.guide.yellowingPoint2'),
            t('educational.guide.yellowingPoint3'),
            t('educational.guide.yellowingPoint4'),
          ],
        },
      ],
    },
  ];

  const quickFacts = [
    {
      id: 'f1',
      icon: 'time-outline',
      title: t('educational.fact.flowerLifespan'),
      fact: t('educational.fact.flowerLifespanDesc'),
    },
    {
      id: 'f2',
      icon: 'water-outline',
      title: t('educational.fact.wateringNeeds'),
      fact: t('educational.fact.wateringNeedsDesc'),
    },
    {
      id: 'f3',
      icon: 'sunny-outline',
      title: t('educational.fact.sunlight'),
      fact: t('educational.fact.sunlightDesc'),
    },
    {
      id: 'f4',
      icon: 'leaf-outline',
      title: t('educational.fact.pollinationSuccess'),
      fact: t('educational.fact.pollinationSuccessDesc'),
    },
    {
      id: 'f5',
      icon: 'calendar-outline',
      title: t('educational.fact.daysToMaturity'),
      fact: t('educational.fact.daysToMaturityDesc'),
    },
    {
      id: 'f6',
      icon: 'thermometer-outline',
      title: t('educational.fact.temperature'),
      fact: t('educational.fact.temperatureDesc'),
    },
  ];

  const toggleSection = (sectionId) => {
    setExpandedSection(expandedSection === sectionId ? null : sectionId);
  };

  const handleVideoPress = (url) => {
    Linking.openURL(url).catch(err => console.error('Error opening video:', err));
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('educational.title')}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.welcomeCard}>
          <Ionicons name="school" size={48} color={theme.colors.primary} />
          <Text style={styles.welcomeTitle}>{t('educational.welcome')}</Text>
          <Text style={styles.welcomeText}>
            {t('educational.welcomeDesc')}
          </Text>
        </View>

        {/* Video Tutorials Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="play-circle" size={24} color={theme.colors.primary} />
            <Text style={styles.sectionTitle}>{t('educational.videoTutorials')}</Text>
          </View>
          {videoTutorials.map((video) => {
            const thumbnailUrl = getYouTubeThumbnail(video.url);
            return (
              <TouchableOpacity
                key={video.id}
                style={styles.videoCard}
                onPress={() => handleVideoPress(video.url)}
                activeOpacity={0.7}
              >
                <View style={styles.videoThumbnail}>
                  {thumbnailUrl ? (
                    <>
                      <Image 
                        source={{ uri: thumbnailUrl }}
                        style={styles.thumbnailImage}
                        resizeMode="cover"
                        onError={(e) => {
                          console.log('Thumbnail load error for:', video.title, e.nativeEvent.error);
                        }}
                      />
                      <View style={styles.playOverlay}>
                        <Ionicons name="play-circle" size={64} color="rgba(255,255,255,0.9)" />
                      </View>
                    </>
                  ) : (
                    <Ionicons name="play-circle" size={48} color={theme.colors.primary} />
                  )}
                  <View style={styles.videoDuration}>
                    <Text style={styles.videoDurationText}>{video.duration}</Text>
                  </View>
                </View>
                <View style={styles.videoInfo}>
                  <View style={styles.videoCategoryBadge}>
                    <Text style={styles.videoCategoryText}>{video.category}</Text>
                  </View>
                  <Text style={styles.videoTitle}>{video.title}</Text>
                  <Text style={styles.videoDescription}>{video.description}</Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Quick Facts Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="flash" size={24} color={theme.colors.warning} />
            <Text style={styles.sectionTitle}>{t('educational.quickFacts')}</Text>
          </View>
          <View style={styles.factsGrid}>
            {quickFacts.map((item) => (
              <View key={item.id} style={styles.factCard}>
                <Ionicons name={item.icon} size={28} color={theme.colors.primary} />
                <Text style={styles.factTitle}>{item.title}</Text>
                <Text style={styles.factText}>{item.fact}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Detailed Guides Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="book" size={24} color={theme.colors.success} />
            <Text style={styles.sectionTitle}>{t('educational.detailedGuides')}</Text>
          </View>
          {guides.map((guide) => (
            <View key={guide.id} style={styles.guideCard}>
              <TouchableOpacity
                style={styles.guideHeader}
                onPress={() => toggleSection(guide.id)}
                activeOpacity={0.7}
              >
                <View style={styles.guideHeaderLeft}>
                  <View style={[styles.guideIcon, { backgroundColor: guide.color + '20' }]}>
                    <Ionicons name={guide.icon} size={24} color={guide.color} />
                  </View>
                  <Text style={styles.guideTitle}>{guide.title}</Text>
                </View>
                <Ionicons 
                  name={expandedSection === guide.id ? 'chevron-up' : 'chevron-down'} 
                  size={24} 
                  color={theme.colors.text.secondary} 
                />
              </TouchableOpacity>

              {expandedSection === guide.id && (
                <View style={styles.guideContent}>
                  {guide.sections.map((section, index) => (
                    <View key={index} style={styles.guideSection}>
                      <Text style={styles.guideSubtitle}>{section.subtitle}</Text>
                      {section.points.map((point, pointIndex) => (
                        <View key={pointIndex} style={styles.guidePoint}>
                          <View style={styles.bulletPoint} />
                          <Text style={styles.guidePointText}>{point}</Text>
                        </View>
                      ))}
                    </View>
                  ))}
                </View>
              )}
            </View>
          ))}
        </View>

        {/* Additional Resources Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="link" size={24} color={theme.colors.info} />
            <Text style={styles.sectionTitle}>{t('educational.additionalResources')}</Text>
          </View>
          <View style={styles.resourceCard}>
            <Ionicons name="chatbubble-ellipses-outline" size={24} color={theme.colors.primary} />
            <View style={styles.resourceContent}>
              <Text style={styles.resourceTitle}>{t('educational.needHelp')}</Text>
              <Text style={styles.resourceText}>
                {t('educational.needHelpDesc')}
              </Text>
            </View>
          </View>
          <TouchableOpacity 
            style={styles.resourceCard}
            onPress={() => navigation.navigate('Community')}
            activeOpacity={0.7}
          >
            <Ionicons name="people-outline" size={24} color={theme.colors.success} />
            <View style={styles.resourceContent}>
              <Text style={styles.resourceTitle}>{t('educational.communityForum')}</Text>
              <Text style={styles.resourceText}>
                {t('educational.communityForumDesc')}
              </Text>
              <View style={styles.resourceAction}>
                <Text style={styles.resourceActionText}>{t('educational.joinDiscussion')}</Text>
                <Ionicons name="arrow-forward" size={16} color={theme.colors.success} />
              </View>
            </View>
          </TouchableOpacity>
        </View>

        <TouchableOpacity 
          style={styles.actionButton}
          onPress={() => navigation.navigate('Pollination')}
        >
          <Ionicons name="leaf" size={20} color="#fff" style={styles.buttonIcon} />
          <Text style={styles.actionButtonText}>{t('educational.goToPollination')}</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: theme.colors.background.primary,
  },
  headerRow: {
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.lg, 
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1, 
    borderBottomColor: theme.colors.background.secondary,
    backgroundColor: theme.colors.surface,
  },
  backButton: { 
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { 
    fontSize: 20,
    fontFamily: theme.fonts.bold,
    color: theme.colors.text.primary,
  },
  content: { 
    padding: theme.spacing.lg, 
    paddingBottom: theme.spacing.xl * 2,
  },
  welcomeCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.large,
    padding: theme.spacing.xl,
    alignItems: 'center',
    marginBottom: theme.spacing.xl,
    borderWidth: 1,
    borderColor: theme.colors.background.secondary,
  },
  welcomeTitle: {
    fontSize: 20,
    fontFamily: theme.fonts.bold,
    color: theme.colors.text.primary,
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.sm,
    textAlign: 'center',
  },
  welcomeText: {
    fontSize: 14,
    fontFamily: theme.fonts.regular,
    color: theme.colors.text.secondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  section: {
    marginBottom: theme.spacing.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: theme.fonts.bold,
    color: theme.colors.text.primary,
    marginLeft: theme.spacing.sm,
  },
  videoCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.medium,
    marginBottom: theme.spacing.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: theme.colors.background.secondary,
  },
  videoThumbnail: {
    height: 180,
    backgroundColor: theme.colors.background.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  thumbnailImage: {
    width: '100%',
    height: '100%',
    position: 'absolute',
    top: 0,
    left: 0,
  },
  playOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  videoDuration: {
    position: 'absolute',
    bottom: theme.spacing.sm,
    right: theme.spacing.sm,
    backgroundColor: 'rgba(0,0,0,0.8)',
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 4,
    borderRadius: 4,
  },
  videoDurationText: {
    color: '#fff',
    fontSize: 12,
    fontFamily: theme.fonts.semiBold,
  },
  videoInfo: {
    padding: theme.spacing.md,
  },
  videoCategoryBadge: {
    alignSelf: 'flex-start',
    backgroundColor: theme.colors.primary + '20',
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 4,
    borderRadius: 4,
    marginBottom: theme.spacing.xs,
  },
  videoCategoryText: {
    fontSize: 11,
    fontFamily: theme.fonts.semiBold,
    color: theme.colors.primary,
    textTransform: 'uppercase',
  },
  videoTitle: {
    fontSize: 16,
    fontFamily: theme.fonts.semiBold,
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.xs,
  },
  videoDescription: {
    fontSize: 13,
    fontFamily: theme.fonts.regular,
    color: theme.colors.text.secondary,
    lineHeight: 18,
  },
  factsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -theme.spacing.xs,
  },
  factCard: {
    width: '50%',
    padding: theme.spacing.xs,
  },
  factCardInner: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.medium,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.background.secondary,
    minHeight: 140,
  },
  factCard: {
    width: '50%',
    padding: theme.spacing.xs,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.medium,
    margin: theme.spacing.xs,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.background.secondary,
    minHeight: 140,
  },
  factTitle: {
    fontSize: 13,
    fontFamily: theme.fonts.semiBold,
    color: theme.colors.text.primary,
    marginTop: theme.spacing.sm,
    marginBottom: theme.spacing.xs,
  },
  factText: {
    fontSize: 12,
    fontFamily: theme.fonts.regular,
    color: theme.colors.text.secondary,
    lineHeight: 16,
  },
  guideCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.medium,
    marginBottom: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.background.secondary,
    overflow: 'hidden',
  },
  guideHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: theme.spacing.md,
  },
  guideHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  guideIcon: {
    width: 44,
    height: 44,
    borderRadius: theme.borderRadius.medium,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.spacing.md,
  },
  guideTitle: {
    fontSize: 16,
    fontFamily: theme.fonts.semiBold,
    color: theme.colors.text.primary,
    flex: 1,
  },
  guideContent: {
    paddingHorizontal: theme.spacing.md,
    paddingBottom: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: theme.colors.background.secondary,
  },
  guideSection: {
    marginTop: theme.spacing.md,
  },
  guideSubtitle: {
    fontSize: 15,
    fontFamily: theme.fonts.semiBold,
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.sm,
  },
  guidePoint: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: theme.spacing.xs,
    paddingLeft: theme.spacing.sm,
  },
  bulletPoint: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: theme.colors.primary,
    marginTop: 6,
    marginRight: theme.spacing.sm,
  },
  guidePointText: {
    flex: 1,
    fontSize: 13,
    fontFamily: theme.fonts.regular,
    color: theme.colors.text.secondary,
    lineHeight: 18,
  },
  resourceCard: {
    flexDirection: 'row',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.medium,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.background.secondary,
  },
  resourceContent: {
    flex: 1,
    marginLeft: theme.spacing.md,
  },
  resourceTitle: {
    fontSize: 15,
    fontFamily: theme.fonts.semiBold,
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.xs,
  },
  resourceText: {
    fontSize: 13,
    fontFamily: theme.fonts.regular,
    color: theme.colors.text.secondary,
    lineHeight: 18,
  },
  resourceAction: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: theme.spacing.sm,
  },
  resourceActionText: {
    fontSize: 13,
    fontFamily: theme.fonts.semiBold,
    color: theme.colors.success,
    marginRight: 4,
  },
  actionButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.medium,
    padding: theme.spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: theme.spacing.md,
  },
  buttonIcon: {
    marginRight: theme.spacing.sm,
  },
  actionButtonText: {
    fontSize: 16,
    fontFamily: theme.fonts.semiBold,
    color: '#fff',
  },
});

EducationalScreen.routeName = 'Educational';
export default EducationalScreen;
