import { relations } from "drizzle-orm/relations";
import { User, Session, Project, Interview, Research, Report, BlogPost, AuditLog, Account, DailyRun, QueryCandidate, Cluster, DailyPick } from "./schema";

export const SessionRelations = relations(Session, ({one}) => ({
	User: one(User, {
		fields: [Session.userId],
		references: [User.id]
	}),
}));

export const UserRelations = relations(User, ({many}) => ({
	Sessions: many(Session),
	Projects: many(Project),
	Interviews: many(Interview),
	Reports: many(Report),
	BlogPosts: many(BlogPost),
	AuditLogs: many(AuditLog),
	Accounts: many(Account),
}));

export const ProjectRelations = relations(Project, ({one, many}) => ({
	User: one(User, {
		fields: [Project.userId],
		references: [User.id]
	}),
	Interviews: many(Interview),
	Research: many(Research),
	Reports: many(Report),
}));

export const InterviewRelations = relations(Interview, ({one}) => ({
	Project: one(Project, {
		fields: [Interview.projectId],
		references: [Project.id]
	}),
	User: one(User, {
		fields: [Interview.userId],
		references: [User.id]
	}),
}));

export const ResearchRelations = relations(Research, ({one}) => ({
	Project: one(Project, {
		fields: [Research.projectId],
		references: [Project.id]
	}),
}));

export const ReportRelations = relations(Report, ({one}) => ({
	Project: one(Project, {
		fields: [Report.projectId],
		references: [Project.id]
	}),
	User: one(User, {
		fields: [Report.userId],
		references: [User.id]
	}),
}));

export const BlogPostRelations = relations(BlogPost, ({one}) => ({
	User: one(User, {
		fields: [BlogPost.authorId],
		references: [User.id]
	}),
}));

export const AuditLogRelations = relations(AuditLog, ({one}) => ({
	User: one(User, {
		fields: [AuditLog.userId],
		references: [User.id]
	}),
}));

export const AccountRelations = relations(Account, ({one}) => ({
	User: one(User, {
		fields: [Account.userId],
		references: [User.id]
	}),
}));

export const QueryCandidateRelations = relations(QueryCandidate, ({one}) => ({
	DailyRun: one(DailyRun, {
		fields: [QueryCandidate.runId],
		references: [DailyRun.id]
	}),
}));

export const DailyRunRelations = relations(DailyRun, ({many}) => ({
	QueryCandidates: many(QueryCandidate),
	Clusters: many(Cluster),
}));

export const ClusterRelations = relations(Cluster, ({one, many}) => ({
	DailyRun: one(DailyRun, {
		fields: [Cluster.runId],
		references: [DailyRun.id]
	}),
	DailyPicks: many(DailyPick),
}));

export const DailyPickRelations = relations(DailyPick, ({one}) => ({
	Cluster: one(Cluster, {
		fields: [DailyPick.winnerClusterId],
		references: [Cluster.id]
	}),
}));