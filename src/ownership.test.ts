import {describe,expect,it} from 'vitest';
import {cards} from './data/cards';
import {endTurn,newBattle,playCard} from './engine';

describe('fixed player ownership across turns',()=>{
  it('keeps a summoned unit with its owner and lane after turn changes',()=>{
    let battle=newBattle(cards);
    const expectedName=battle.players[0].hand[0].name;
    const summoned=playCard(battle,0,1);
    expect(summoned.players[0].lanes[1][0].name).toBe(expectedName);
    battle=endTurn(summoned);
    battle=endTurn(battle);
    expect(battle.active).toBe(0);
    expect(battle.players[0].lanes[1]).toHaveLength(1);
    expect(battle.players[1].lanes[1]).toHaveLength(0);
  });
});
