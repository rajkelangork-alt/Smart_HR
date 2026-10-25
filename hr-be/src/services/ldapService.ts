import { Client } from "ldapts";
import { env } from "../config/env";
import { logger } from "../config/logger";

export interface LdapUserResult {
  email: string;
  cn?: string;
  displayName?: string;
}

export class LdapService {
  public static async authenticate(
    username: string,
    password: string,
  ): Promise<LdapUserResult | null> {
    const client = new Client({
      url: env.LDAP_URL,
      timeout: 5000,
      connectTimeout: 5000,
    });

    try {
      // 1. Initial administrative bind to find the user's distinguished name (DN)
      await client.bind(env.LDAP_BIND_DN, env.LDAP_BIND_PASSWORD);

      const searchResult = await client.search(env.LDAP_SEARCH_BASE, {
        scope: "sub",
        filter: `(|(sAMAccountName=${username})(mail=${username}))`,
        attributes: ["dn", "mail", "cn", "displayName"],
      });

      if (
        !searchResult.searchEntries ||
        searchResult.searchEntries.length === 0
      ) {
        logger.warn(
          `LDAP query: No user directory entry located for "${username}"`,
        );
        await client.unbind();
        return null;
      }

      const userEntry = searchResult.searchEntries[0];
      const userDn = userEntry.dn;

      // 2. Re-bind using target user's DN and supplied credentials to verify password
      const userClient = new Client({ url: env.LDAP_URL, timeout: 5000 });
      await userClient.bind(userDn, password);
      await userClient.unbind();
      await client.unbind();

      return {
        email: (userEntry.mail as string) || username,
        cn: userEntry.cn as string,
        displayName: userEntry.displayName as string,
      };
    } catch (error) {
      logger.error(
        "LDAP authentication attempt encountered an exception:",
        error,
      );
      try {
        await client.unbind();
      } catch {
        // Suppress unbind errors
      }
      return null;
    }
  }
}
