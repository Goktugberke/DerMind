import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { theme } from '@constants/theme';
import Svg, { Circle, G, Path as SvgPath } from 'react-native-svg';
import { FlaskConical } from 'lucide-react-native';

interface AnalysisChartCardProps {
    score: number;
    safeCount: number;
    mediumCount: number;
    riskyCount: number;
}

export const AnalysisChartCard = ({ score, safeCount, mediumCount, riskyCount }: AnalysisChartCardProps) => {

    const radius = 65;
    const strokeWidth = 14;
    const circumference = 2 * Math.PI * radius;

    // Calculate totals and percentages dynamically
    const totalCount = safeCount + mediumCount + riskyCount;

    // Fallbacks if total is 0 to avoid NaN
    const greenPercent = totalCount > 0 ? safeCount / totalCount : 0;
    const bluePercent = totalCount > 0 ? mediumCount / totalCount : 0;
    const redPercent = totalCount > 0 ? riskyCount / totalCount : 0;

    // Math to create SVG Arc paths
    const createPieSlice = (percent: number, offsetPercent: number, radius: number, cx: number, cy: number, color: string) => {
        if (percent === 0) return null;
        if (percent === 1) {
            return <Circle cx={cx} cy={cy} r={radius} fill={color} />;
        }

        const startAngle = offsetPercent * 2 * Math.PI;
        const endAngle = (offsetPercent + percent) * 2 * Math.PI;

        // Calculate coordinates (rotate -90 deg so we start at top)
        const startX = cx + radius * Math.cos(startAngle - Math.PI / 2);
        const startY = cy + radius * Math.sin(startAngle - Math.PI / 2);
        const endX = cx + radius * Math.cos(endAngle - Math.PI / 2);
        const endY = cy + radius * Math.sin(endAngle - Math.PI / 2);

        // Large arc flag: if the angle is > 180 degrees, it's 1, else 0.
        const largeArcFlag = percent > 0.5 ? 1 : 0;

        // SVG Path Data
        // M: Move to center
        // L: Line to start arc
        // A: Draw arc (rx, ry, x-axis-rotation, large-arc-flag, sweep-flag, endX, endY)
        // Z: Close path back to center
        const pathData = `
            M ${cx} ${cy}
            L ${startX} ${startY}
            A ${radius} ${radius} 0 ${largeArcFlag} 1 ${endX} ${endY}
            Z
        `;

        return <SvgPath d={pathData} fill={color} key={color} />;
    };

    return (
        <View style={styles.cardContainer}>
            <View style={styles.headerRow}>
                <View style={styles.titleRow}>
                    <FlaskConical size={20} color="#D81B60" />
                    <Text style={styles.cardTitle}>Analysis Summary</Text>
                </View>
                <Text style={styles.detailsText}>Details</Text>
            </View>

            <View style={styles.chartContainer}>
                {/* SVG Solid Pie Chart */}
                <Svg width={180} height={180} viewBox="0 0 160 160">
                    <G>
                        {/* Soft Pastel Green */}
                        {createPieSlice(greenPercent, 0, 80, 80, 80, '#C1F8DB')}
                        {/* Soft Pastel Yellow/Orange */}
                        {createPieSlice(bluePercent, greenPercent, 80, 80, 80, '#FFEFB3')}
                        {/* Soft Pastel Red */}
                        {createPieSlice(redPercent, greenPercent + bluePercent, 80, 80, 80, '#FFDADA')}

                        {/* White overlay circle for score readability */}
                        <Circle cx="80" cy="80" r="45" fill="rgba(255, 255, 255, 0.9)" />
                    </G>
                </Svg>

                {/* Score Text in the exact center overlaid on the white bubble */}
                <View style={styles.scoreCenterContent}>
                    <Text style={styles.scoreText}>{score.toString().replace('.', ',')}</Text>
                    <Text style={styles.scoreSubtitle}>SAFETY SCORE</Text>
                </View>
            </View>

            {/* Stats Row */}
            <View style={styles.statsRow}>
                <View style={[styles.statBox, styles.statBoxSafe]}>
                    <Text style={styles.statNumber}>{safeCount}</Text>
                    <Text style={styles.statLabel}>SAFE</Text>
                </View>
                <View style={[styles.statBox, styles.statBoxMedium]}>
                    <Text style={styles.statNumber}>{mediumCount}</Text>
                    <Text style={styles.statLabel}>CAUTION</Text>
                </View>
                <View style={[styles.statBox, styles.statBoxRisky]}>
                    <Text style={styles.statNumber}>{riskyCount}</Text>
                    <Text style={styles.statLabel}>RISKY</Text>
                </View>
            </View>

        </View>
    );
};

const styles = StyleSheet.create({
    cardContainer: {
        backgroundColor: '#FFFFFF',
        borderRadius: 20,
        marginHorizontal: 15,
        padding: 20,
        // marginTop: 5,
        marginBottom: 8,
        // Shadow
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 3,
    },
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 15,
    },
    titleRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    cardTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        marginLeft: 8,
        color: theme.colors.text,
    },
    detailsText: {
        fontSize: 12,
        fontWeight: 'bold',
        color: '#D81B60', // Pinkish text color
    },
    chartContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        height: 180,
    },
    scoreCenterContent: {
        position: 'absolute',
        alignItems: 'center',
        justifyContent: 'center',
    },
    scoreText: {
        fontSize: 48,
        fontWeight: '900',
        color: '#D81B60',
        letterSpacing: -1,
    },
    scoreSubtitle: {
        fontSize: 10,
        fontWeight: '800',
        color: theme.colors.gray,
        letterSpacing: 1,
        marginTop: -5,
    },
    statsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 20,
        paddingHorizontal: 5,
    },
    statBox: {
        flex: 1,
        alignItems: 'center',
        paddingVertical: 12,
        marginHorizontal: 4,
        borderRadius: 12,
        borderWidth: 1,
    },
    statBoxSafe: {
        borderColor: '#A7F3D0', // Slightly darker pastel border 
        backgroundColor: '#C1F8DB' // Mint Green
    },
    statBoxMedium: {
        borderColor: '#FDE68A',
        backgroundColor: '#FFEFB3' // Soft Yellow
    },
    statBoxRisky: {
        borderColor: '#FECACA',
        backgroundColor: '#FFDADA' // Blush Red
    },
    statNumber: {
        fontSize: 18,
        fontWeight: 'bold',
        color: theme.colors.text,
    },
    statLabel: {
        fontSize: 10,
        fontWeight: 'bold',
        color: theme.colors.gray,
        marginTop: 4,
        letterSpacing: 0.5,
    }
});
