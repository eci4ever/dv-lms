import { createAccessControl } from "better-auth/plugins/access";
import {
	adminAc,
	defaultStatements,
	ownerAc,
} from "better-auth/plugins/organization/access";

const statement = {
	...defaultStatements,
	course: ["create", "read", "update", "delete", "publish"],
	enrollment: ["read", "update"],
	commerce: ["read", "update"],
	analytics: ["read"],
} as const;

export const organizationAccessControl = createAccessControl(statement);

export const assignableOrganizationRoles = [
	"owner",
	"admin",
	"instructor",
	"course_manager",
	"student",
] as const;

export type AssignableOrganizationRole =
	(typeof assignableOrganizationRoles)[number];

const owner = organizationAccessControl.newRole({
	...ownerAc.statements,
	course: ["create", "read", "update", "delete", "publish"],
	enrollment: ["read", "update"],
	commerce: ["read", "update"],
	analytics: ["read"],
});

const admin = organizationAccessControl.newRole({
	...adminAc.statements,
	course: ["create", "read", "update", "delete", "publish"],
	enrollment: ["read", "update"],
	commerce: ["read"],
	analytics: ["read"],
});

const instructor = organizationAccessControl.newRole({
	course: ["create", "read", "update"],
	enrollment: ["read", "update"],
	analytics: ["read"],
});

const courseManager = organizationAccessControl.newRole({
	course: ["create", "read", "update", "delete", "publish"],
	enrollment: ["read"],
	analytics: ["read"],
});

const student = organizationAccessControl.newRole({
	course: ["read"],
	enrollment: ["read"],
});

export const organizationRoles = {
	owner,
	admin,
	instructor,
	course_manager: courseManager,
	student,
};

export function formatRole(role: string) {
	return role
		.split("_")
		.map((part) => part.replace(/^./, (character) => character.toUpperCase()))
		.join(" ");
}
