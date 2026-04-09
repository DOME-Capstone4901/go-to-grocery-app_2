import React, { useState, useCallback } from 'react';
import { useFocusEffect } from 'expo-router';
import PantryFilter from './myPantry';
import { getPantryItems, loadPantry } from '../../utils/pantryStore';
import { getDaysUntilExpiration, parseExpirationDate } from '../../utils/expiration';

export default function MainPantryTab() {
  const [grouped, setGrouped] = useState({});

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;

      (async () => {
        await loadPantry();
        if (cancelled) return;

        const items = getPantryItems();

        const groups = {
          expired: [],
          soon: [],
          week: [],
          month: [],
          later: [],
          nodate: [],
        };

        items.forEach(item => {
          if (!parseExpirationDate(item.expirationDate)) {
            groups.nodate.push(item);
            return;
          }

          const days = getDaysUntilExpiration(item.expirationDate);

          if (days < 0) groups.expired.push(item);
          else if (days <= 3) groups.soon.push(item);
          else if (days <= 7) groups.week.push(item);
          else if (days <= 30) groups.month.push(item);
          else groups.later.push(item);
        });

        setGrouped(groups);
      })();

      return () => {
        cancelled = true;
      };
    }, [])
  );

  return <PantryFilter groupedItems={grouped} />;
}
