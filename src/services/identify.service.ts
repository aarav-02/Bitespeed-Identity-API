import { prisma } from "../prisma/client";
import { Contact } from "@prisma/client";

export const identifyService = async (
  email?: string,
  phoneNumber?: string
) => {
  const matches = await prisma.contact.findMany({
    where: {
      OR: [
        ...(email ? [{ email }] : []),
        ...(phoneNumber ? [{ phoneNumber }] : []),
      ],
      deletedAt: null,
    },
  });

  if (matches.length === 0) {
    const primary = await prisma.contact.create({
      data: { email, phoneNumber, linkPrecedence: "primary" },
    });
    return formatResponse([primary]);
  }

  const ids = new Set<number>();
  matches.forEach((c: Contact) => {
    ids.add(c.id);
    if (c.linkedId) ids.add(c.linkedId);
  });

  const allContacts = await prisma.contact.findMany({
    where: {
      OR: [
        { id: { in: Array.from(ids) } },
        { linkedId: { in: Array.from(ids) } },
      ],
    },
  });

  const primary = allContacts
    .filter((c: Contact) => c.linkPrecedence === "primary")
    .sort((a: Contact, b: Contact) => a.createdAt.getTime() - b.createdAt.getTime())[0];

  for (const c of allContacts) {
    if (c.id !== primary.id && c.linkPrecedence === "primary") {
      await prisma.contact.update({
        where: { id: c.id },
        data: { linkPrecedence: "secondary", linkedId: primary.id },
      });
    }
  }

  const hasEmail = allContacts.some((c: Contact) => c.email === email);
  const hasPhone = allContacts.some((c: Contact) => c.phoneNumber === phoneNumber);

  if ((email && !hasEmail) || (phoneNumber && !hasPhone)) {
    await prisma.contact.create({
      data: {
        email,
        phoneNumber,
        linkedId: primary.id,
        linkPrecedence: "secondary",
      },
    });
  }

  const finalContacts = await prisma.contact.findMany({
    where: { OR: [{ id: primary.id }, { linkedId: primary.id }] },
  });

  return formatResponse(finalContacts);
};

const formatResponse = (contacts: Contact[]) => {
  const primary = contacts.find((c: Contact) => c.linkPrecedence === "primary");

  const emails: string[] = [];
  const phoneNumbers: string[] = [];

  // Add primary contact's email and phone first
  if (primary?.email) {
    emails.push(primary.email);
  }
  if (primary?.phoneNumber) {
    phoneNumbers.push(primary.phoneNumber);
  }

  // Add other contacts' emails and phones (avoiding duplicates)
  contacts.forEach((c: Contact) => {
    if (c.email && !emails.includes(c.email)) {
      emails.push(c.email);
    }
    if (c.phoneNumber && !phoneNumbers.includes(c.phoneNumber)) {
      phoneNumbers.push(c.phoneNumber);
    }
  });

  return {
    contact: {
      primaryContatctId: primary!.id,
      emails,
      phoneNumbers,
      secondaryContactIds: contacts
        .filter((c: Contact) => c.linkPrecedence === "secondary")
        .map((c: Contact) => c.id),
    },
  };
};
