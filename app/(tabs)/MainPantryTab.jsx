import React, { useState, useCallback } from 'react';
import { useFocusEffect } from 'expo-router';
import PantryFilter from './myPantry';
import { getPantryItems } from '../../utils/pantryStore';
import { getDaysUntilExpiration } from '../../utils/expiration';

export default function MainPantryTab() {
  const [grouped, setGrouped] = useState({});

  useFocusEffect(
    useCallback(() => {
      const items = getPantryItems();

      const groups = {
        expired: [],
        soon: [],
        week: [],
        month: [],
        later: [],
      };

      items.forEach(item => {
        const days = getDaysUntilExpiration(item.expirationDate);

        if (days < 0) groups.expired.push(item);
        else if (days <= 3) groups.soon.push(item);
        else if (days <= 7) groups.week.push(item);
        else if (days <= 30) groups.month.push(item);
        else groups.later.push(item);
      });

      setGrouped(groups);
    }, [])
  );

  return <PantryFilter groupedItems={grouped} />;
}
