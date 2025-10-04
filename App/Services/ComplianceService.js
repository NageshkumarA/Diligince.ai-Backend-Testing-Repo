const mongoose = require('mongoose');
const { ComplianceRecord } = require('../Modules/Industry/Schema');

class ComplianceService {
  
  constructor() {
    this.isoStandards = {
      'ISO-9001': {
        name: 'Quality Management Systems',
        version: '2015',
        categories: [
          'Context of the Organization',
          'Leadership',
          'Planning',
          'Support',
          'Operation',
          'Performance Evaluation',
          'Improvement'
        ]
      },
      'ISO-27001': {
        name: 'Information Security Management',
        version: '2022',
        categories: [
          'Information Security Policies',
          'Organization of Information Security',
          'Human Resource Security',
          'Asset Management',
          'Access Control',
          'Cryptography',
          'Physical and Environmental Security',
          'Operations Security',
          'Communications Security',
          'System Acquisition, Development and Maintenance',
          'Supplier Relationships',
          'Information Security Incident Management',
          'Information Security Aspects of Business Continuity Management',
          'Compliance'
        ]
      },
      'ISO-14001': {
        name: 'Environmental Management Systems',
        version: '2015',
        categories: [
          'Context of the Organization',
          'Leadership',
          'Planning',
          'Support',
          'Operation',
          'Performance Evaluation',
          'Improvement'
        ]
      },
      'ISO-45001': {
        name: 'Occupational Health and Safety Management Systems',
        version: '2018',
        categories: [
          'Context of the Organization',
          'Leadership and Worker Participation',
          'Planning',
          'Support',
          'Operation',
          'Performance Evaluation',
          'Improvement'
        ]
      },
      'ISO-31000': {
        name: 'Risk Management Guidelines',
        version: '2018',
        categories: [
          'Risk Management Principles',
          'Risk Management Framework',
          'Risk Management Process'
        ]
      }
    };
  }

  async createAssessment(assessmentData) {
    try {
      const assessment = new ComplianceRecord({
        ...assessmentData,
        assessmentDate: new Date()
      });

      // Auto-calculate score if findings are provided
      if (assessmentData.findings && assessmentData.findings.length > 0) {
        assessment.score = this.calculateComplianceScore(assessmentData.findings);
        assessment.maxScore = 100;
      }

      await assessment.save();
      return assessment;
    } catch (error) {
      console.error('Error creating compliance assessment:', error);
      throw error;
    }
  }

  calculateComplianceScore(findings) {
    if (!findings || findings.length === 0) return 100;

    let totalDeductions = 0;
    const severityWeights = {
      'low': 2,
      'medium': 5,
      'high': 10,
      'critical': 20
    };

    findings.forEach(finding => {
      totalDeductions += severityWeights[finding.severity] || 0;
    });

    return Math.max(0, 100 - totalDeductions);
  }

  async getComplianceStatus(entityId, entityType) {
    try {
      const latestAssessments = await ComplianceRecord.aggregate([
        {
          $match: { entityId: new mongoose.Types.ObjectId(entityId), entityType }
        },
        {
          $sort: { assessmentDate: -1 }
        },
        {
          $group: {
            _id: '$standard',
            latestAssessment: { $first: '$$ROOT' }
          }
        }
      ]);

      const complianceStatus = {
        entityId,
        entityType,
        overallStatus: 'compliant',
        overallScore: 0,
        standards: {},
        lastAssessmentDate: null,
        nextAssessmentDue: null
      };

      let totalScore = 0;
      let assessmentCount = 0;
      let hasNonCompliant = false;

      latestAssessments.forEach(item => {
        const assessment = item.latestAssessment;
        complianceStatus.standards[assessment.standard] = {
          status: assessment.status,
          score: assessment.score,
          assessmentDate: assessment.assessmentDate,
          nextAssessmentDate: assessment.nextAssessmentDate,
          findings: assessment.findings.length,
          criticalFindings: assessment.findings.filter(f => f.severity === 'critical').length
        };

        if (assessment.score) {
          totalScore += assessment.score;
          assessmentCount++;
        }

        if (assessment.status !== 'compliant') {
          hasNonCompliant = true;
        }

        if (!complianceStatus.lastAssessmentDate || 
            assessment.assessmentDate > complianceStatus.lastAssessmentDate) {
          complianceStatus.lastAssessmentDate = assessment.assessmentDate;
        }

        if (!complianceStatus.nextAssessmentDue || 
            (assessment.nextAssessmentDate && assessment.nextAssessmentDate < complianceStatus.nextAssessmentDue)) {
          complianceStatus.nextAssessmentDue = assessment.nextAssessmentDate;
        }
      });

      if (assessmentCount > 0) {
        complianceStatus.overallScore = Math.round(totalScore / assessmentCount);
      }

      if (hasNonCompliant) {
        complianceStatus.overallStatus = 'partially_compliant';
      }

      return complianceStatus;
    } catch (error) {
      console.error('Error getting compliance status:', error);
      throw error;
    }
  }

  async generateComplianceReport(filters = {}) {
    try {
      const { entityType, standard, startDate, endDate, status } = filters;

      const matchFilter = {};
      if (entityType) matchFilter.entityType = entityType;
      if (standard) matchFilter.standard = standard;
      if (status) matchFilter.status = status;
      if (startDate || endDate) {
        matchFilter.assessmentDate = {};
        if (startDate) matchFilter.assessmentDate.$gte = new Date(startDate);
        if (endDate) matchFilter.assessmentDate.$lte = new Date(endDate);
      }

      const reportData = await ComplianceRecord.aggregate([
        { $match: matchFilter },
        {
          $group: {
            _id: {
              standard: '$standard',
              status: '$status'
            },
            count: { $sum: 1 },
            avgScore: { $avg: '$score' },
            totalFindings: { $sum: { $size: '$findings' } },
            criticalFindings: {
              $sum: {
                $size: {
                  $filter: {
                    input: '$findings',
                    cond: { $eq: ['$$this.severity', 'critical'] }
                  }
                }
              }
            }
          }
        },
        {
          $group: {
            _id: '$_id.standard',
            statusBreakdown: {
              $push: {
                status: '$_id.status',
                count: '$count',
                avgScore: '$avgScore',
                totalFindings: '$totalFindings',
                criticalFindings: '$criticalFindings'
              }
            },
            totalAssessments: { $sum: '$count' }
          }
        },
        {
          $sort: { totalAssessments: -1 }
        }
      ]);

      // Calculate overall metrics
      const overallMetrics = await ComplianceRecord.aggregate([
        { $match: matchFilter },
        {
          $group: {
            _id: null,
            totalAssessments: { $sum: 1 },
            avgScore: { $avg: '$score' },
            compliantCount: {
              $sum: { $cond: [{ $eq: ['$status', 'compliant'] }, 1, 0] }
            },
            nonCompliantCount: {
              $sum: { $cond: [{ $eq: ['$status', 'non_compliant'] }, 1, 0] }
            },
            partiallyCompliantCount: {
              $sum: { $cond: [{ $eq: ['$status', 'partially_compliant'] }, 1, 0] }
            }
          }
        }
      ]);

      return {
        filters,
        overallMetrics: overallMetrics[0] || {},
        standardsBreakdown: reportData,
        generatedAt: new Date(),
        reportPeriod: {
          startDate: startDate || null,
          endDate: endDate || null
        }
      };
    } catch (error) {
      console.error('Error generating compliance report:', error);
      throw error;
    }
  }

  async getUpcomingAssessments(daysAhead = 30) {
    try {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + daysAhead);

      const upcomingAssessments = await ComplianceRecord.find({
        nextAssessmentDate: {
          $gte: new Date(),
          $lte: futureDate
        }
      })
        .populate('assessedBy', 'email')
        .sort({ nextAssessmentDate: 1 });

      return upcomingAssessments;
    } catch (error) {
      console.error('Error getting upcoming assessments:', error);
      throw error;
    }
  }

  async calculateOverallScore(entityId, entityType = 'industry') {
    try {
      const latestAssessments = await ComplianceRecord.aggregate([
        {
          $match: { 
            entityId: new mongoose.Types.ObjectId(entityId), 
            entityType,
            score: { $exists: true, $ne: null }
          }
        },
        {
          $sort: { assessmentDate: -1 }
        },
        {
          $group: {
            _id: '$standard',
            latestScore: { $first: '$score' }
          }
        },
        {
          $group: {
            _id: null,
            avgScore: { $avg: '$latestScore' },
            standardCount: { $sum: 1 }
          }
        }
      ]);

      return latestAssessments[0]?.avgScore || 0;
    } catch (error) {
      console.error('Error calculating overall compliance score:', error);
      return 0;
    }
  }

  // ISO 9001 - Quality Management System Assessment
  async assessISO9001(entityId, entityType, assessmentData) {
    const iso9001Assessment = {
      entityId,
      entityType,
      standard: 'ISO-9001',
      version: '2015',
      ...assessmentData,
      findings: assessmentData.findings || []
    };

    // Add specific ISO 9001 quality checks
    if (!assessmentData.findings) {
      iso9001Assessment.findings = this.generateISO9001Findings(assessmentData);
    }

    return this.createAssessment(iso9001Assessment);
  }

  // ISO 27001 - Information Security Management Assessment
  async assessISO27001(entityId, entityType, assessmentData) {
    const iso27001Assessment = {
      entityId,
      entityType,
      standard: 'ISO-27001',
      version: '2022',
      ...assessmentData,
      findings: assessmentData.findings || []
    };

    // Add specific ISO 27001 security checks
    if (!assessmentData.findings) {
      iso27001Assessment.findings = this.generateISO27001Findings(assessmentData);
    }

    return this.createAssessment(iso27001Assessment);
  }

  generateISO9001Findings(assessmentData) {
    const findings = [];
    
    // Example quality management findings
    if (!assessmentData.qualityPolicy) {
      findings.push({
        category: 'Leadership',
        description: 'Quality policy not documented or communicated',
        severity: 'high',
        recommendation: 'Establish and document quality policy'
      });
    }

    if (!assessmentData.processDocumentation) {
      findings.push({
        category: 'Operation',
        description: 'Process documentation incomplete',
        severity: 'medium',
        recommendation: 'Complete process documentation and mapping'
      });
    }

    return findings;
  }

  generateISO27001Findings(assessmentData) {
    const findings = [];
    
    // Example information security findings
    if (!assessmentData.securityPolicy) {
      findings.push({
        category: 'Information Security Policies',
        description: 'Information security policy not established',
        severity: 'critical',
        recommendation: 'Establish comprehensive information security policy'
      });
    }

    if (!assessmentData.accessControl) {
      findings.push({
        category: 'Access Control',
        description: 'Access control procedures inadequate',
        severity: 'high',
        recommendation: 'Implement role-based access control system'
      });
    }

    return findings;
  }

  getISOStandards() {
    return this.isoStandards;
  }

  getStandardCategories(standard) {
    return this.isoStandards[standard]?.categories || [];
  }
}

module.exports = ComplianceService;