import React, { useCallback, useEffect, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';

import { ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { useTheme } from 'styled-components';
import { HighlightCard } from '../../components/HighlightCard';
import { TransactionCard, TransactionCardProps } from '../../components/TransactionCard';

import {
  Container,
  Header,
  UserWrapper,
  UserInfo,
  Photo,
  User,
  UserGreeting,
  UserName,
  LogoutButton,
  Icon,
  HighlightCards,
  Transactions,
  TransactionList,
  Title,
  LoadContainer,
} from './styles';
import { useAuth } from '../../hooks/auth';

export interface DatalistProps extends TransactionCardProps {
  id: string;
}
interface HighlightProps {
  amount: string;
  lastTransaction: string;
}
interface HighlightData {
  deposits: HighlightProps;
  withdraws: HighlightProps;
  total: HighlightProps;
}

export function Dashboard() {
  const [isLoading, setIsLoading] = useState(true);
  const [transactions, setTransactions] = useState<DatalistProps[]>([]);
  const [highlightData, setHighlightData] = useState<HighlightData>({} as HighlightData);

  const { user, signOut } = useAuth();
  const theme = useTheme();
  
  async function loadTransactions() {
    const dataKey = `@gofinances:transactions_user:${user.id}`;
    let entriesTotal = 0;
    let expensiveTotal = 0;
    const response = await AsyncStorage.getItem(dataKey);
    const transactions = response ? JSON.parse(response) : [];

    const transactionsFormatted: DatalistProps[] = transactions.map((item: DatalistProps) => {
      if( item.type === 'positive') {
        entriesTotal += Number(item.amount);
      } else {
        expensiveTotal += Number(item.amount);
      }
      const amount = Number(item.amount).toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL'
      });
 
      const date = Intl.DateTimeFormat('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: '2-digit',
      }).format(new Date(item.date));

      return { 
        id: item.id,
        name: item.name,
        amount,
        type: item.type,
        category: item.category,
        date,
      }
    });

    const total = entriesTotal - expensiveTotal;

    const lastTransactionEntries = getLastTransactionDate(transactions, 'positive');
    const lastTransactionExpensives = getLastTransactionDate(transactions, 'negative');
    const totalInterval = lastTransactionExpensives === 'Não há transações' ? 
      lastTransactionExpensives
      : `01 a ${lastTransactionExpensives}`;

    setTransactions(transactionsFormatted);
    setHighlightData({
      deposits: {
        amount: entriesTotal.toLocaleString('pt-BR', {
          style: 'currency',
          currency: 'BRL',
        }),
        lastTransaction: lastTransactionEntries,
      },
      withdraws: {
        amount: expensiveTotal.toLocaleString('pt-BR', {
          style: 'currency',
          currency: 'BRL'
        }),
        lastTransaction: lastTransactionExpensives,
      },
      total: {
        amount: total.toLocaleString('pt-BR', {
          style: 'currency',
          currency: 'BRL'
        }),
        lastTransaction: totalInterval,
      },
    });
    setIsLoading(false);
  }

  function getLastTransactionDate(
    collection: DatalistProps[],
    type: 'positive' | 'negative'
  ){
    const collectionFilttered = collection
      .filter((transactions) => transactions.type === type);
    
    if(collectionFilttered.length === 0){
      return "Não há transações";
    }

    const lasTransaction = new Date(
      Math.max.apply(Math,
        collectionFilttered.map(
          (transactions) => new Date(transactions.date).getTime()
        )
      )
    );
    const day = lasTransaction.getDate();
    const month = lasTransaction.toLocaleString('pt-BR', { month: 'long'});
    if (type === 'positive'){
      return `Última entrada dia ${day} de ${month}`;
    } else {
      return `Última saída dia ${day} de ${month}`;
    }
  }

  useEffect(() => {
    loadTransactions();
    // resetData();
  },[]);
 
  useFocusEffect(useCallback(() => {
    loadTransactions();
  }, []));

  return (
    <Container>
      <ActivityIndicator />
      {
        isLoading ?
        <LoadContainer>
          <ActivityIndicator 
            color={theme.colors.primary}
            size="large"
          />
        </LoadContainer>
        :
        <>
        <Header>
          <UserWrapper>
            <UserInfo>
              <Photo source={{uri: user.photo}} />
              <User>
                <UserGreeting>Olá,</UserGreeting>
                <UserName>{user.name}</UserName>
              </User>
            </UserInfo>
            
            <LogoutButton onPress={signOut}>
              <Icon name="power"/>
            </LogoutButton>
            
          </UserWrapper>
        </Header>

        <HighlightCards>
          <HighlightCard
            type="up"
            title="Entradas"
            amount={highlightData.deposits.amount}
            lastTransaction={highlightData.deposits.lastTransaction}
          />
          <HighlightCard
            type="down"
            title="Saídas"
            amount={highlightData.withdraws.amount}
            lastTransaction={highlightData.withdraws.lastTransaction}
          />
          <HighlightCard
            type="total"
            title="Total"
            amount={highlightData.total.amount}
            lastTransaction={highlightData.total.lastTransaction}
          />
        </HighlightCards>

        <Transactions>
          <Title>Listagem</Title>
          
          <TransactionList
            data={transactions}
            keyExtractor={item => item.id}
            renderItem={({ item}) => <TransactionCard data={item}/>}
          />
        </Transactions>
        </>
      }
    </Container>
  )
}