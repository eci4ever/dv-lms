import { createAccessControl } from "better-auth/plugins/access";
import {
	adminAc,
	defaultStatements,
	memberAc,
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
	"member",
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
	commerce: ["read", "update"],
	analytics: ["read"],
});

const member = organizationAccessControl.newRole({
	...memberAc.statements,
	course: ["read"],
	enrollment: ["read"],
});

export const organizationRoles = {
	owner,
	admin,
	member,
};

export function formatRole(role: string) {
	return role
		.split("_")
		.map((part) => part.replace(/^./, (character) => character.toUpperCase()))
		.join(" ");
}
