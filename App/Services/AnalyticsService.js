const mongoose = require('mongoose');
const { 
  Requirement, 
  RFQ, 
  Quote, 
  PurchaseOrder, 
  WorkflowActivity 
} = require('../Modules/Industry/Schema');

class AnalyticsService {
  
  async getDashboardMetrics(industryId, dateRange = {}) {
    try {
      const { startDate, endDate } = dateRange;
      const dateFilter = {};
      
      if (startDate) dateFilter.$gte = new Date(startDate);
      if (endDate) dateFilter.$lte = new Date(endDate);

      const filter = { industryId };
      if (Object.keys(dateFilter).length > 0) {
        filter.createdAt = dateFilter;
      }

      const [
        requirementStats,
        rfqStats,
        quoteStats,
        poStats,
        spendingAnalysis,
        vendorPerformance
      ] = await Promise.all([
        this.getRequirementStats(filter),
        this.getRFQStats(filter),
        this.getQuoteStats(filter),
        this.getPurchaseOrderStats(filter),
        this.getSpendingAnalysis(industryId, dateRange),
        this.getVendorPerformance(industryId, dateRange)
      ]);

      return {
        requirements: requirementStats,
        rfqs: rfqStats,
        quotes: quoteStats,
        purchaseOrders: poStats,
        spending: spendingAnalysis,
        vendors: vendorPerformance,
        generatedAt: new Date()
      };
    } catch (error) {
      console.error('Error getting dashboard metrics:', error);
      throw error;
    }
  }

  async getRequirementStats(filter) {
    try {
      const stats = await Requirement.aggregate([
        { $match: filter },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
            avgBudget: { $avg: '$budget.max' }
          }
        }
      ]);

      const categoryStats = await Requirement.aggregate([
        { $match: filter },
        {
          $group: {
            _id: '$category',
            count: { $sum: 1 },
            totalBudget: { $sum: '$budget.max' }
          }
        },
        { $sort: { count: -1 } }
      ]);

      const priorityStats = await Requirement.aggregate([
        { $match: filter },
        {
          $group: {
            _id: '$priority',
            count: { $sum: 1 }
          }
        }
      ]);

      return {
        statusBreakdown: stats,
        categoryBreakdown: categoryStats,
        priorityBreakdown: priorityStats,
        total: stats.reduce((sum, item) => sum + item.count, 0)
      };
    } catch (error) {
      console.error('Error getting requirement stats:', error);
      throw error;
    }
  }

  async getRFQStats(filter) {
    try {
      const stats = await RFQ.aggregate([
        { $match: filter },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 }
          }
        }
      ]);

      const responseRates = await RFQ.aggregate([
        { $match: filter },
        {
          $lookup: {
            from: 'quotes',
            localField: '_id',
            foreignField: 'rfqId',
            as: 'quotes'
          }
        },
        {
          $group: {
            _id: null,
            totalRFQs: { $sum: 1 },
            respondedRFQs: {
              $sum: {
                $cond: [{ $gt: [{ $size: '$quotes' }, 0] }, 1, 0]
              }
            }
          }
        },
        {
          $project: {
            responseRate: {
              $multiply: [
                { $divide: ['$respondedRFQs', '$totalRFQs'] },
                100
              ]
            }
          }
        }
      ]);

      return {
        statusBreakdown: stats,
        responseRate: responseRates[0]?.responseRate || 0,
        total: stats.reduce((sum, item) => sum + item.count, 0)
      };
    } catch (error) {
      console.error('Error getting RFQ stats:', error);
      throw error;
    }
  }

  async getQuoteStats(filter) {
    try {
      // Get RFQ IDs for the industry
      const rfqs = await RFQ.find(filter, '_id');
      const rfqIds = rfqs.map(rfq => rfq._id);

      const stats = await Quote.aggregate([
        { $match: { rfqId: { $in: rfqIds } } },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
            avgAmount: { $avg: '$pricing.totalAmount' }
          }
        }
      ]);

      const priceAnalysis = await Quote.aggregate([
        { $match: { rfqId: { $in: rfqIds } } },
        {
          $group: {
            _id: null,
            minPrice: { $min: '$pricing.totalAmount' },
            maxPrice: { $max: '$pricing.totalAmount' },
            avgPrice: { $avg: '$pricing.totalAmount' },
            totalValue: { $sum: '$pricing.totalAmount' }
          }
        }
      ]);

      return {
        statusBreakdown: stats,
        priceAnalysis: priceAnalysis[0] || {},
        total: stats.reduce((sum, item) => sum + item.count, 0)
      };
    } catch (error) {
      console.error('Error getting quote stats:', error);
      throw error;
    }
  }

  async getPurchaseOrderStats(filter) {
    try {
      const stats = await PurchaseOrder.aggregate([
        { $match: filter },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
            totalValue: { $sum: '$totalValue' }
          }
        }
      ]);

      const monthlyTrend = await PurchaseOrder.aggregate([
        { $match: filter },
        {
          $group: {
            _id: {
              year: { $year: '$createdAt' },
              month: { $month: '$createdAt' }
            },
            count: { $sum: 1 },
            totalValue: { $sum: '$totalValue' }
          }
        },
        { $sort: { '_id.year': 1, '_id.month': 1 } }
      ]);

      return {
        statusBreakdown: stats,
        monthlyTrend,
        total: stats.reduce((sum, item) => sum + item.count, 0),
        totalValue: stats.reduce((sum, item) => sum + item.totalValue, 0)
      };
    } catch (error) {
      console.error('Error getting purchase order stats:', error);
      throw error;
    }
  }

  async getSpendingAnalysis(industryId, dateRange = {}) {
    try {
      const { startDate, endDate } = dateRange;
      const dateFilter = { industryId };
      
      if (startDate || endDate) {
        dateFilter.createdAt = {};
        if (startDate) dateFilter.createdAt.$gte = new Date(startDate);
        if (endDate) dateFilter.createdAt.$lte = new Date(endDate);
      }

      const spendingByCategory = await PurchaseOrder.aggregate([
        { $match: dateFilter },
        {
          $lookup: {
            from: 'requirements',
            localField: 'requirementId',
            foreignField: '_id',
            as: 'requirement'
          }
        },
        { $unwind: { path: '$requirement', preserveNullAndEmptyArrays: true } },
        {
          $group: {
            _id: '$requirement.category',
            totalSpent: { $sum: '$totalValue' },
            orderCount: { $sum: 1 },
            avgOrderValue: { $avg: '$totalValue' }
          }
        },
        { $sort: { totalSpent: -1 } }
      ]);

      const spendingByVendor = await PurchaseOrder.aggregate([
        { $match: dateFilter },
        {
          $lookup: {
            from: 'vendorprofiles',
            localField: 'vendorId',
            foreignField: '_id',
            as: 'vendor'
          }
        },
        { $unwind: '$vendor' },
        {
          $group: {
            _id: '$vendorId',
            vendorName: { $first: '$vendor.companyName' },
            totalSpent: { $sum: '$totalValue' },
            orderCount: { $sum: 1 }
          }
        },
        { $sort: { totalSpent: -1 } },
        { $limit: 10 }
      ]);

      return {
        byCategory: spendingByCategory,
        byVendor: spendingByVendor,
        totalSpending: spendingByCategory.reduce((sum, item) => sum + item.totalSpent, 0)
      };
    } catch (error) {
      console.error('Error getting spending analysis:', error);
      throw error;
    }
  }

  async getVendorPerformance(industryId, dateRange = {}) {
    try {
      const { startDate, endDate } = dateRange;
      const dateFilter = { industryId };
      
      if (startDate || endDate) {
        dateFilter.createdAt = {};
        if (startDate) dateFilter.createdAt.$gte = new Date(startDate);
        if (endDate) dateFilter.createdAt.$lte = new Date(endDate);
      }

      const performance = await PurchaseOrder.aggregate([
        { $match: dateFilter },
        {
          $lookup: {
            from: 'vendorprofiles',
            localField: 'vendorId',
            foreignField: '_id',
            as: 'vendor'
          }
        },
        { $unwind: '$vendor' },
        {
          $group: {
            _id: '$vendorId',
            vendorName: { $first: '$vendor.companyName' },
            totalOrders: { $sum: 1 },
            completedOrders: {
              $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
            },
            totalValue: { $sum: '$totalValue' },
            avgOrderValue: { $avg: '$totalValue' },
            onTimeDelivery: {
              $avg: {
                $cond: [
                  { $lte: ['$actualEndDate', '$endDate'] },
                  1,
                  0
                ]
              }
            }
          }
        },
        {
          $project: {
            vendorName: 1,
            totalOrders: 1,
            completedOrders: 1,
            totalValue: 1,
            avgOrderValue: 1,
            completionRate: {
              $multiply: [
                { $divide: ['$completedOrders', '$totalOrders'] },
                100
              ]
            },
            onTimeDeliveryRate: { $multiply: ['$onTimeDelivery', 100] }
          }
        },
        { $sort: { totalValue: -1 } }
      ]);

      return performance;
    } catch (error) {
      console.error('Error getting vendor performance:', error);
      throw error;
    }
  }

  async getComplianceMetrics(industryId) {
    try {
      const ComplianceRecord = mongoose.model('ComplianceRecord');
      
      const metrics = await ComplianceRecord.aggregate([
        {
          $match: {
            entityType: 'industry',
            entityId: new mongoose.Types.ObjectId(industryId)
          }
        },
        {
          $group: {
            _id: '$standard',
            latestAssessment: { $last: '$$ROOT' }
          }
        },
        {
          $project: {
            standard: '$_id',
            status: '$latestAssessment.status',
            score: '$latestAssessment.score',
            assessmentDate: '$latestAssessment.assessmentDate',
            nextAssessmentDate: '$latestAssessment.nextAssessmentDate'
          }
        }
      ]);

      const overallScore = metrics.reduce((sum, metric) => {
        return sum + (metric.score || 0);
      }, 0) / (metrics.length || 1);

      return {
        standards: metrics,
        overallScore: Math.round(overallScore),
        totalStandards: metrics.length,
        compliantStandards: metrics.filter(m => m.status === 'compliant').length
      };
    } catch (error) {
      console.error('Error getting compliance metrics:', error);
      throw error;
    }
  }
}

module.exports = AnalyticsService;