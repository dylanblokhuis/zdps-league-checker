import { config } from "https://deno.land/x/dotenv/dotenv.ts";
import { createRouter } from "https://servestjs.org/@v0.27.0/router.ts";
import { sleep, http } from './utils.ts';

const { LEAGUE } = config();

interface Ladder {
  total: number,
  cached_since: string,
  entries: LadderRank[],
}

interface LadderRank {
  rank: number,
  dead: boolean,
  online: boolean,
  skills: undefined | object,
  character: {
    name: string,
    level: number,
    class: string,
    id: string,
    experience: number,
    depth: {
      default: number,
      solo: number,
    }
  },
  account: {
    name: string,
    realm: string,
    challenges: {
      total: number
    }
  }
}

interface Item {
  socketedItems: undefined | socketedItem[],
  typeLine: string,
  // ... whatever 
}

interface socketedItem extends Item {
  support: boolean,
  links: number,
  // ... whatever
}

async function getLadder(): Promise<Ladder> {
  const response = await fetch(`https://api.pathofexile.com/ladders/${LEAGUE}?limit=3`);
  if (response.ok) {
    return await response.json();
  } else {
    throw new Error("Fetching ladder failed");
  }
}

function filterMainSkill(items: Item[]): socketedItem {
  const socketedGems = items
    .filter((item) => item.socketedItems !== undefined)
    .map(({ socketedItems }) => {
      const supportGems = socketedItems.filter(item => {
        return item.support && item.support === true;
      });

      return socketedItems
        .map((gem) => {
          if (gem.support !== undefined && gem.support === false) {
            gem.links = supportGems.length;

            return gem;
          }
        })
        .find((gem) => gem !== undefined)
  })



  return socketedGems
    .sort((a, b) => b.links - a.links)
    .find(gem => gem !== undefined);  
}

async function getPlayerItems(accountName: string, character: string): Promise<socketedItem> {
  console.log(accountName, character);
  const formData = new FormData();
  formData.append('accountName', accountName);
  formData.append('character', character);
  formData.append('realm', 'pc');

  let response;

  try {
    response = await http(
      new Request(`https://pathofexile.com/character-window/get-items?accountName=${accountName}&character=${character}`)
    );

    const { items } = await response.json();

    if (items && items.length === 0) {
      return null;
    }

    return await filterMainSkill(items);
  } catch (response) {
    console.log(response)
  }
}

async function ethical() {
  try {
    const { entries } = await getLadder();

    const ethicalPlayers: Promise<any>[] = entries.map(async (player) => {
      const mainSkill = await getPlayerItems(player.account.name, player.character.name);
      
      if (mainSkill) {
        return {
          skill: mainSkill.typeLine,
          links: mainSkill.links,
          player: player.account.name,
          character: player.character.name
        }
      } else {
        return null;
      }
    })
      
    const playerItems = await Promise.all(ethicalPlayers);

    return await playerItems.filter(entry => entry != null);
  } catch (error) {
    console.error(error);
  }
}

const router = createRouter();

router.handle("/", async (req) => {
  await req.respond({
    status: 200,
    headers: new Headers({
      "content-type": "text/html; charset=UTF-8"
    }),
    body: JSON.stringify(await ethical())
  })
});

router.listen(":8000");